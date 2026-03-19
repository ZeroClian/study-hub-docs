## 概述
本文是一个完整的基于Redis的多维度原子限流方案，结合Redis Lua脚本（滑动窗口）、Java注解和AOP切面，实现一个灵活、高性能和支持多维度组合的限流器。方案有以下特点：

+ 原子操作：通过Lua脚本保证限流检查和扣减的原子操作，避免并发竞争。
+ 多维度：支持全局限流、IP限流、用户限流等多维度组合，可任意扩展。
+ 滑动窗口：使用Redis有序集合记录请求时间戳，实现精确的滑动窗口限流，而非简单的时间周期重置。
+ 注解驱动：通过`@RateLimit`注解快速声明限流规则，降低使用成本。
+ 降级处理：可自定义降级处理，当限流触发时可以优雅处理。

### Lua脚本设计
#### 预检查阶段（只读）
+ 初始化：使用`exists`检查`value_key（限流维度键）`是否存在，不存在则设置为`max_tokens(最大令牌数)`
+ 回收过期令牌
    - 使用`zrangebyscore`获取`0到当前毫秒数-时间窗口`的过期记录
    - 遍历记录，通过`String.match(v,":(%d+)$")`提取每个请求消耗的令牌数，累加得到`expire_count`
    - 使用zremrangebyscore删除过期记录
    - 将`expire_count`加回`value_key`，并使用`Math.min`限制不超过`max_tokens`
+ 检查配额：读取`value_key`，若当前值小于令牌申请数`permit`，直接返回`0（失败）`

#### 扣减阶段（只写）
只有所有维度的预检查都通过，才执行此阶段

+ 记录本次请求：构建`permit_record = request_id .. ":" .. permits`，使用zadd将当前时间戳以`score`记录到`permits_key`。
+ 扣减令牌：读取`value_key`，减去`permits`后写回。
+ 设置过期时间：为`value_key` `permits_key`设置TTL`（interval * 2 / 1000 秒，最少1秒）`，防止长期不活跃的维度占用内存。

最后返回`1`，表示成功获取所有维度令牌。

#### 完整脚本
```lua
-- 原子化多维度限流脚本
-- 基于滑动时间窗口实现的多维度原子限流
-- 只有所有维度都满足条件时才扣减令牌，确保原子性

-- 参数说明：
-- KEYS[1..N]: 限流维度键列表
-- ARGV[1]: 当前时间戳（毫秒）
-- ARGV[2]: 申请令牌数
-- ARGV[3]: 时间窗口（毫秒）
-- ARGV[4]: 最大令牌数（窗口内允许的总数）
-- ARGV[5]: 请求唯一标识

local now_ms = tonumber(ARGV[1])
local permits = tonumber(ARGV[2])
local interval = tonumber(ARGV[3])
local max_tokens = tonumber(ARGV[4])
local request_id = ARGV[5]

-- 第一阶段：预检查阶段 - 检查所有维度是否有足够令牌
for i, key in ipairs(KEYS) do
  local value_key = key .. ":value"
  local permits_key = key .. ":permits"

  -- 初始化 value_key（如果不存在）
  if redis.call("exists", value_key) == 0 then
    redis.call("set", value_key, max_tokens)
  end

  -- 回收过期令牌
  -- 清理过期的 permit 记录，并回收配额到 value_key
  local expired_values = redis.call("zrangebyscore", permits_key, 0, now_ms - interval)
  if #expired_values > 0 then
    local expired_count = 0
    for _, v in ipairs(expired_values) do
      -- 优化解析逻辑：使用更高效的模式匹配
      local p = tonumber(string.match(v, ":(%d+)$"))
      if p then
        expired_count = expired_count + p
      end
    end

    -- 删除过期记录
    redis.call("zremrangebyscore", permits_key, 0, now_ms - interval)

    -- 回收配额
    if expired_count > 0 then
      local curr_v = tonumber(redis.call("get", value_key) or max_tokens)
      local next_v = math.min(max_tokens, curr_v + expired_count)
      redis.call("set", value_key, next_v)
    end
  end

  -- 核心检查：当前可用令牌是否足够
  local current_val = tonumber(redis.call("get", value_key) or max_tokens)
  if current_val < permits then
    -- 任何一个维度配额不足，直接返回失败
    return 0
  end
end

-- 第二阶段：扣减阶段 - 只有所有维度都通过后才执行
for i, key in ipairs(KEYS) do
  local value_key = key .. ":value"
  local permits_key = key .. ":permits"

  -- 记录本次令牌分配（格式：request_id:permits）
  local permit_record = request_id .. ":" .. permits
  redis.call("zadd", permits_key, now_ms, permit_record)

  -- 扣减令牌
  local current_v = tonumber(redis.call("get", value_key) or max_tokens)
  redis.call("set", value_key, current_v - permits)

  -- 设置过期时间，确保过期令牌能被正常回收 (窗口的2倍，至少1秒)
  local expire_time = math.ceil(interval * 2 / 1000)
  if expire_time < 1 then expire_time = 1 end
  redis.call("expire", value_key, expire_time)
  redis.call("expire", permits_key, expire_time)
end

-- 成功获取所有维度的令牌
return 1
```

#### Redis命令详解
| 命令 | 作用 | 脚本使用示例 |
| --- | --- | --- |
| EXISTS key | 检查 key 是否存在 | redis.call("exists", value_key) — 判断是否需要初始化 |
| SET key value | 设置字符串值 | redis.call("set", value_key, max_tokens) — 初始化/更新剩余令牌 |
| GET key | 获取字符串值 | redis.call("get", value_key) — 读取当前剩余令牌数 |
| ZRANGEBYSCORE key min max | 返回有序集合中指定分数范围的成员 | redis.call("zrangebyscore", permits_key, 0, now_ms - interval) — 获取过期请求记录 |
| ZREMRANGEBYSCORE key min max | 删除有序集合中指定分数范围的成员 | redis.call("zremrangebyscore", permits_key, 0, now_ms - interval) — 清理过期记录 |
| ZADD key score member | 向有序集合添加成员 | redis.call("zadd", permits_key, now_ms, permit_record) — 记录本次请求 |
| EXPIRE key seconds | 设置键的生存时间（秒） | redis.call("expire", value_key, expire_time) — 自动清理不活跃的键 |


### Java注解
#### 注解定义
```java
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    enum Dimension { GLOBAL, IP, USER }
    Dimension[] dimensions() default {Dimension.GLOBAL};
    double count();
    long interval() default 1;
    TimeUnit timeUnit() default TimeUnit.SECONDS;
    long timeout() default 0;          // 未在 AOP 中实际使用
    String fallback() default "";
    enum TimeUnit { MILLISECONDS, SECONDS, MINUTES, HOURS, DAYS }
}
```

#### 属性详解
+ Dimension：限流维度枚举
    - GLOBAL：全局限流
    - IP：IP限流
    - USER：用户限流
+ Dimension[]：限流维度数组，支持组合使用
+ count：窗口内允许的最大请求数（令牌总数）
+ interval：时间窗口，默认1秒，与TimeUnit配合使用
+ timeout：超时时间，默认0，不等待
+ fallback：降级方法名，当限流触发时调用，降级方法需与注解方法在同一个类中，且参数列表一致或无参
+ TimeUnit：时间单位枚举

### AOP实现
#### 核心职责
+ 拦截带有`@RateLimit`注解的方法
+ 根据注解配置生成限流维度键列表
+ 调用Redis Lua脚本执行原子限流
+ 处理限流结果，成功则放行，失败则降级处理或抛出异常

#### 初始化与脚本加载
```java
private static String LUA_SCRIPT;
private String luaScriptSha;

static {
    // 从 classpath 加载脚本文件
    ClassPathResource resource = new ClassPathResource("scripts/rate_limit.lua");
    LUA_SCRIPT = new String(resource.getContentAsByteArray(), StandardCharsets.UTF_8);
}

@PostConstruct
public void init() {
    // 预加载脚本到 Redis，返回 SHA1 缓存，提高后续调用性能
    this.luaScriptSha = redissonClient.getScript(StringCodec.INSTANCE).scriptLoad(LUA_SCRIPT);
}
```



#### 环绕通知处理流程
```java
    /**
     * 环绕通知：拦截带 @RateLimit 注解的方法
     */
    @Around("@annotation(rateLimit)")
    public Object around(ProceedingJoinPoint joinPoint, RateLimit rateLimit) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        String className = method.getDeclaringClass().getSimpleName();
        String methodName = method.getName();

        // 1. 计算时间窗口（毫秒）
        long intervalMs = calculateIntervalMs(rateLimit.interval(), rateLimit.timeUnit());

        // 2. 根据配置维度动态生成 Redis Keys
        List<String> keys = generateKeys(className, methodName, rateLimit.dimensions());

        // 3. 调用 Lua 脚本执行原子限流
        // 使用 StringCodec 确保参数正确传递为字符串
        RScript script = redissonClient.getScript(StringCodec.INSTANCE);

        // 准备参数
        List<Object> keysList = new ArrayList<>(keys);
        Object[] args = {
                String.valueOf(System.currentTimeMillis()), // ARGV[1]: 当前时间戳
                String.valueOf(1),                          // ARGV[2]: 申请令牌数（默认1个）
                String.valueOf(intervalMs),                 // ARGV[3]: 时间窗口
                String.valueOf(rateLimit.count()),          // ARGV[4]: 最大令牌数
                UUID.randomUUID().toString()               // ARGV[5]: 请求唯一标识
        };

        Object resultObj = script.evalSha(
                RScript.Mode.READ_WRITE,
                luaScriptSha,
                RScript.ReturnType.VALUE,
                keysList,
                args
        );

        // 将结果转换为 Long
        Long result = convertToLong(resultObj);

        // 4. 处理限流结果
        if (result == null || result == 0) {
            return handleRateLimitExceeded(joinPoint, rateLimit, keys);
        }

        // 5. 执行原方法
        return joinPoint.proceed();
    }
```

#### 降级处理
```java
private Object handleRateLimitExceeded(ProceedingJoinPoint joinPoint, RateLimit rateLimit, List<String> keys)
        throws Throwable {
    String methodName = joinPoint.getSignature().getName();
    // 如果配置了降级方法，则调用降级方法
    if (rateLimit.fallback() != null && !rateLimit.fallback().isEmpty()) {
        try {
            Method fallbackMethod = findFallbackMethod(joinPoint, rateLimit.fallback());
            if (fallbackMethod != null) {
                log.debug("限流触发，执行降级方法: {}.{} -> {}",
                        joinPoint.getTarget().getClass().getSimpleName(),
                        methodName,
                        rateLimit.fallback());
                // 如果降级方法有参数，传入原方法的参数
                if (fallbackMethod.getParameterCount() > 0) {
                    return fallbackMethod.invoke(joinPoint.getTarget(), joinPoint.getArgs());
                } else {
                    return fallbackMethod.invoke(joinPoint.getTarget());
                }
            }
        } catch (Exception e) {
            log.error("降级方法执行失败: {}", rateLimit.fallback(), e);
        }
    
    // 没有降级方法或降级失败，抛出限流异常
    log.debug("限流触发，拒绝请求: keys={}, count={} per {} {}",
            keys, rateLimit.count(), rateLimit.interval(), rateLimit.timeUnit());
    throw new RateLimitExceededException("请求过于频繁，请稍后再试");
}
```

#### 辅助方法
```java
private List<String> generateKeys(String className, String methodName, RateLimit.Dimension[] dimensions) {
    List<String> keys = new ArrayList<>();
    // 使用 {} 包含类名和方法名作为 Hash Tag，确保该方法的所有限流 Key 落在同一个 Redis Slot
    String hashTag = "{" + className + ":" + methodName + "}";
    String keyPrefix = "ratelimit:" + hashTag;

    for (RateLimit.Dimension dimension : dimensions) {
        switch (dimension) {
            case GLOBAL -> keys.add(keyPrefix + ":global");
            case IP -> keys.add(keyPrefix + ":ip:" + getClientIp());
            case USER -> keys.add(keyPrefix + ":user:" + getCurrentUserId());
        }
    }
    return keys;
}
```

hashTag的作用：在Redis Cluster中，使用{}包围的部分作为哈希标签，保证所有相关键被分配到同一个槽位，从而支持多键Lua脚本的原子执行。`getClientIP()`和`getCurrentUserId()`根据业务按需实现

```java
private Method findFallbackMethod(ProceedingJoinPoint joinPoint, String fallbackName) {
    Class<?> targetClass = joinPoint.getTarget().getClass();
    MethodSignature signature = (MethodSignature) joinPoint.getSignature();
    Class<?>[] parameterTypes = signature.getParameterTypes();
    
    try {
        // 1. 尝试查找同参数列表的方法
        Method method = targetClass.getDeclaredMethod(fallbackName, parameterTypes);
        method.setAccessible(true);
        return method;
    } catch (NoSuchMethodException e) {
        // 2. 尝试查找无参方法
        try {
            Method method = targetClass.getDeclaredMethod(fallbackName);
            method.setAccessible(true);
            return method;
        } catch (NoSuchMethodException ex) {
            log.warn("未找到降级方法: {}.{} (需无参或参数列表一致)",
                    targetClass.getSimpleName(), fallbackName);
            return null;
        }
    }
}
```

#### 完整代码
```java
/**
 * 限流 AOP 切面
 * 基于滑动时间窗口实现的多维度原子限流
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class RateLimitAspect {

    private final RedissonClient redissonClient;

    /**
     * Lua 脚本缓存
     */
    private static String LUA_SCRIPT;
    private String luaScriptSha;

    static {
        try {
            ClassPathResource resource = new ClassPathResource("scripts/rate_limit.lua");
            LUA_SCRIPT = new String(resource.getContentAsByteArray(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException("加载限流 Lua 脚本失败", e);
        }
    }

    /**
     * 初始化：预加载脚本到 Redis 提高性能
     */
    @jakarta.annotation.PostConstruct
    public void init() {
        this.luaScriptSha = redissonClient.getScript(StringCodec.INSTANCE).scriptLoad(LUA_SCRIPT);
        log.info("限流 Lua 脚本加载完成, SHA1: {}", luaScriptSha);
    }

    /**
     * 环绕通知：拦截带 @RateLimit 注解的方法
     */
    @Around("@annotation(rateLimit)")
    public Object around(ProceedingJoinPoint joinPoint, RateLimit rateLimit) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        String className = method.getDeclaringClass().getSimpleName();
        String methodName = method.getName();

        // 1. 计算时间窗口（毫秒）
        long intervalMs = calculateIntervalMs(rateLimit.interval(), rateLimit.timeUnit());

        // 2. 根据配置维度动态生成 Redis Keys
        List<String> keys = generateKeys(className, methodName, rateLimit.dimensions());

        // 3. 调用 Lua 脚本执行原子限流
        // 使用 StringCodec 确保参数正确传递为字符串
        RScript script = redissonClient.getScript(StringCodec.INSTANCE);

        // 准备参数
        List<Object> keysList = new ArrayList<>(keys);
        Object[] args = {
            String.valueOf(System.currentTimeMillis()), // ARGV[1]: 当前时间戳
            String.valueOf(1),                          // ARGV[2]: 申请令牌数（默认1个）
            String.valueOf(intervalMs),                 // ARGV[3]: 时间窗口
            String.valueOf(rateLimit.count()),          // ARGV[4]: 最大令牌数
            UUID.randomUUID().toString()               // ARGV[5]: 请求唯一标识
        };

        Object resultObj = script.evalSha(
            RScript.Mode.READ_WRITE,
            luaScriptSha,
            RScript.ReturnType.VALUE,
            keysList,
            args
        );

        // 将结果转换为 Long
        Long result = convertToLong(resultObj);

        // 4. 处理限流结果
        if (result == null || result == 0) {
            return handleRateLimitExceeded(joinPoint, rateLimit, keys);
        }

        // 5. 执行原方法
        return joinPoint.proceed();
    }

    /**
     * 计算时间窗口毫秒数
     */
    private long calculateIntervalMs(long interval, RateLimit.TimeUnit unit) {
        return switch (unit) {
            case MILLISECONDS -> interval;
            case SECONDS -> interval * 1000;
            case MINUTES -> interval * 60 * 1000;
            case HOURS -> interval * 3600 * 1000;
            case DAYS -> interval * 86400 * 1000;
        };
    }

    /**
     * 将结果对象安全转换为 Long
     */
    private Long convertToLong(Object obj) {
        if (obj == null) {
            return null;
        }
        if (obj instanceof Long) {
            return (Long) obj;
        } else if (obj instanceof Integer) {
            return ((Integer) obj).longValue();
        } else if (obj instanceof Short) {
            return ((Short) obj).longValue();
        } else if (obj instanceof Byte) {
            return ((Byte) obj).longValue();
        } else if (obj instanceof String) {
            try {
                return Long.parseLong((String) obj);
            } catch (NumberFormatException e) {
                log.warn("无法将字符串转换为Long: {}", obj);
                return null;
            }
        }
        log.warn("不支持的对象类型转换为Long: {}", obj.getClass().getName());
        return null;
    }

    /**
     * 生成限流键列表
     */
    private List<String> generateKeys(String className, String methodName, RateLimit.Dimension[] dimensions) {
        List<String> keys = new ArrayList<>();
        // 使用 {} 包含类名和方法名作为 Hash Tag，确保该方法的所有限流 Key 落在同一个 Redis Slot
        // 从而适配 Redis Cluster 模式
        String hashTag = "{" + className + ":" + methodName + "}";
        String keyPrefix = "ratelimit:" + hashTag;

        for (RateLimit.Dimension dimension : dimensions) {
            switch (dimension) {
                case GLOBAL -> keys.add(keyPrefix + ":global");
                case IP -> keys.add(keyPrefix + ":ip:" + getClientIp());
                case USER -> keys.add(keyPrefix + ":user:" + getCurrentUserId());
            }
        }

        return keys;
    }

    /**
     * 处理限流超出情况
     */
    private Object handleRateLimitExceeded(ProceedingJoinPoint joinPoint, RateLimit rateLimit, List<String> keys)
            throws Throwable {
        String methodName = joinPoint.getSignature().getName();

        // 如果配置了降级方法，则调用降级方法
        if (rateLimit.fallback() != null && !rateLimit.fallback().isEmpty()) {
            try {
                Method fallbackMethod = findFallbackMethod(joinPoint, rateLimit.fallback());
                if (fallbackMethod != null) {
                    log.debug("限流触发，执行降级方法: {}.{} -> {}",
                            joinPoint.getTarget().getClass().getSimpleName(),
                            methodName,
                            rateLimit.fallback());
                    // 如果降级方法有参数，传入原方法的参数
                    if (fallbackMethod.getParameterCount() > 0) {
                        return fallbackMethod.invoke(joinPoint.getTarget(), joinPoint.getArgs());
                    } else {
                        return fallbackMethod.invoke(joinPoint.getTarget());
                    }
                }
            } catch (Exception e) {
                log.error("降级方法执行失败: {}", rateLimit.fallback(), e);
            }
        }

        // 没有降级方法或降级失败，抛出限流异常
        log.debug("限流触发，拒绝请求: keys={}, count={} per {} {}",
                keys, rateLimit.count(), rateLimit.interval(), rateLimit.timeUnit());
        throw new RateLimitExceededException("请求过于频繁，请稍后再试");
    }

    /**
     * 查找降级方法
     * 优先查找与原方法参数列表完全一致的方法，找不到则查找无参方法
     */
    private Method findFallbackMethod(ProceedingJoinPoint joinPoint, String fallbackName) {
        Class<?> targetClass = joinPoint.getTarget().getClass();
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Class<?>[] parameterTypes = signature.getParameterTypes();

        try {
            // 1. 尝试查找同参数列表的方法
            Method method = targetClass.getDeclaredMethod(fallbackName, parameterTypes);
            method.setAccessible(true);
            return method;
        } catch (NoSuchMethodException e) {
            // 2. 尝试查找无参方法
            try {
                Method method = targetClass.getDeclaredMethod(fallbackName);
                method.setAccessible(true);
                return method;
            } catch (NoSuchMethodException ex) {
                log.warn("未找到降级方法: {}.{} (需无参或参数列表一致)",
                        targetClass.getSimpleName(), fallbackName);
                return null;
            }
        }
    }

    /**
     * 获取客户端真实 IP
     * 处理 X-Forwarded-For 头，支持代理服务器场景
     */
    private String getClientIp() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return "unknown";
        }

        HttpServletRequest request = attributes.getRequest();
        String ip = request.getHeader("X-Forwarded-For");

        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }

        // 处理多个 IP 的情况（X-Forwarded-For 可能包含多个 IP）
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }

        return ip != null ? ip : "unknown";
    }

    /**
     * 获取当前用户 ID
     * 从请求属性或 Session 中获取
     * TODO: 需要根据实际项目的认证框架进行实现，本项目未显示用户管理
     */
    private String getCurrentUserId() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            return "anonymous";
        }

        HttpServletRequest request = attributes.getRequest();

        // 方式1: 从请求属性中获取（推荐）
        Object userId = request.getAttribute("userId");
        if (userId != null) {
            return userId.toString();
        }

        // 方式2: 从请求头中获取
        userId = request.getHeader("X-User-Id");
        if (userId != null) {
            return userId.toString();
        }

        // 方式3: 从 Session 中获取（如果使用 Session）
        // userId = request.getSession().getAttribute("userId");

        // 方式4: 从 JWT Token 中解析（如果使用 JWT）
        // 需要集成具体的 JWT 工具类

        return "anonymous";
    }
}
```

