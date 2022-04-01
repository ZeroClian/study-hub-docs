> 使用技术：SpringBoot + Redis
>
> ❗️本人初学，代码或许有些考虑不周的地方，仅做参考，其他锁相关知识请自行百度，随着后续学习，或许会更新基于Zookeeper的实现

#### 1.初步结构

![分布式锁](https://gitee.com/ZeroClian/my-picture/raw/master/img/%E5%88%86%E5%B8%83%E5%BC%8F%E9%94%81.png)

#### 2.代码结构：

[iShot2021-12-12 15.53.04](https://gitee.com/ZeroClian/my-picture/raw/master/img/iShot2021-12-12%2015.53.04.png)

3. 准备工作（百度一堆）：

1. 整合Redis到SpringBoot中
2. 本地或服务器搭建好redis环境

目标：实现一个可重入自旋的分布式锁，并提供注解形式，便于使用。

> 源码地址：https://github.com/ZeroClian/z-blog

一、工具类

```java

/**
 * 锁的工具类
 * 1.生成key、value
 * 2.获取分布式注解
 *
 * @Author: ZeroClian
 * @Date: 2021-12-09 10:16 上午
 */
public class RedisReentrantLockUtils {

    /**
     * mac地址
     */
    public static final String MAC = "macAddress";
    /**
     * 虚拟机ID
     */
    public static final String JVM = "jvmPid";
    /**
     * 线程ID
     */
    public static final String THREAD = "threadId";

    /**
     * 通过切点的key策略生成锁的key
     * @param joinPoint
     * @return
     */
    public static String getLockKey(ProceedingJoinPoint joinPoint) {
        DistributeLock distributeLock = getDistributeLock(joinPoint);
        StringBuffer lockKey = new StringBuffer();
        //key前缀
        if (Strings.isNotBlank(distributeLock.param())) {
            Object[] args = joinPoint.getArgs();
            try {
                Integer index = new Integer(distributeLock.param());
                Object prefix = args[index];
                if (args.length >= index) {
                    lockKey.append(prefix.toString()).append("@");
                }
            } catch (Exception e) {
            }
        }
        //根据策略生成key
        LockKeyStrategy lockKeyStrategy = distributeLock.keyStrategy();
        MethodSignature methodSignature = (MethodSignature) joinPoint.getSignature();
        String signature = getSignature(methodSignature.getMethod());
        switch (lockKeyStrategy) {
            case USER_METHOD:
                // 获取请求头中的token
                HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
                return lockKey.append(request.getHeader(HttpHeaders.AUTHORIZATION) + "@" + signature).toString();
            case CUSTOM:
                return lockKey.append(Strings.isNotBlank(distributeLock.lockKey()) ? distributeLock.lockKey() : signature).toString();
            case METHOD:
            default:
                return lockKey.append(signature).toString();
        }
    }

    /**
     * mac地址 + 虚拟机ID + 线程ID
     */
    public static String getLockValue() {
        HashMap<String, Object> map = new HashMap<>(3);
        map.put(MAC, getMacAddress());
        map.put(JVM, getJvmId());
        map.put(THREAD, getThreadId());
        return JSON.toJSON(map);
    }

    public static String getMacAddress() {
        String address = "";
        try {
            // 获取localhost的网卡设备
            NetworkInterface networkInterface = NetworkInterface.getByInetAddress(InetAddress.getLocalHost());
            // 获取硬件地址
            byte[] hardwareAddress = networkInterface.getHardwareAddress();
            StringBuilder builder = new StringBuilder();
            for (int i = 0; i < hardwareAddress.length; i++) {
                builder.append(String.format("%02X%s", hardwareAddress[i], (i < hardwareAddress.length - 1) ? "-" : ""));
            }
            address = builder.toString();
        } catch (Exception e) {
            return "";
        }
        return address;
    }

    public static Integer getJvmId() {
        try {
            RuntimeMXBean runtimeMxBean = ManagementFactory.getRuntimeMXBean();
            Field jvm = runtimeMxBean.getClass().getDeclaredField("jvm");
            jvm.setAccessible(true);
            VMManagement vmManagement = (VMManagement) jvm.get(runtimeMxBean);
            Method pidMethod = vmManagement.getClass().getDeclaredMethod("getProcessId");
            pidMethod.setAccessible(true);
            return (Integer) pidMethod.invoke(vmManagement);
        } catch (Exception e) {
            return -1;
        }
    }

    public static long getThreadId() {
        return Thread.currentThread().getId();
    }

    /**
     * 获取分布式锁注解
     *
     * @param joinPoint 切入点
     * @return {@link DistributeLock} 锁
     */
    public static DistributeLock getDistributeLock(JoinPoint joinPoint) {
        // 获取被增强的方法相关信息
        // getSignature()：修饰符+ 包名+组件名(类名) +方法名
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        // 作用目标类是否有锁
        Class<?> targetClass = joinPoint.getTarget().getClass();
        DistributeLock distributeLock = targetClass.getAnnotation(DistributeLock.class);
        if (distributeLock == null) {
            //获取方法上的锁
            Method method = signature.getMethod();
            distributeLock = method.getAnnotation(DistributeLock.class);
            return distributeLock;
        } else {
            return distributeLock;
        }
    }

    /**
     * 获取方法签名
     * @param method
     * @return
     */
    private static String getSignature(Method method) {
        StringBuilder builder = new StringBuilder();
        Class<?> returnType = method.getReturnType();
        if (returnType != null) {
            builder.append(returnType.getName()).append("#");
        }
        builder.append(method.getName());
        Class<?>[] parameters = method.getParameterTypes();
        for (int i = 0; i < parameters.length; i++) {
            if (i == 0) {
                builder.append(":");
            } else {
                builder.append(",");
            }
            builder.append(parameters[i].getName());
        }
        return builder.toString();
    }

}
```

二、锁的具体实现

```java
/**
 * 基于redis的分布式可重入(非公平)自旋锁
 * 1.   只有一个客户端 (唯一标识为 mac地址+jvm的id+thread的id) 能获取锁
 * 2.   客户端崩溃后超出规定时间后锁也会自动解除
 * 3.   同一客户端在请求到锁后可重复获取锁
 * 4.   加锁和解锁必须是同一个客户端
 * 5.   非公平锁
 * 6.   如果客户端没有崩溃,守护线程会在锁超时时间的2/3阶段进行锁的续期
 *
 * @Author: ZeroClian
 * @Date: 2021-12-09 3:53 下午
 */
public class RedisReentrantLock {

    private final Logger log = LoggerFactory.getLogger(RedisReentrantLock.class);
    /**
     * 同个线程的重入次数
     */
    private final ThreadLocal<AtomicInteger> lockCount;
    /**
     * 锁键
     */
    private final String lockKey;
    /**
     * 锁值
     */
    private final String lockValue;
    /**
     * 过期时间
     */
    private final long timeOut;
    /**
     * 获取锁的策略
     */
    private final LockStrategy strategy;
    /**
     * 自旋间隔 单位毫秒
     */
    private static final long SPIN_TIME = 500;
    /**
     * 释放redis锁成功的标识
     */
    private final long REDIS_UNLOCK_SUCCESS = 1;
    /**
     * 释放锁的lua脚本
     */
    private final String REDIS_UNLOCK_LUA
            = " if redis.call('get',KEYS[1]) == ARGV[1] " +
            " then " +
            " return redis.call('del',KEYS[1]) " +
            " else " +
            " return 0 end";

    public RedisReentrantLock(String lockKey, String lockValue, long timeOut, LockStrategy strategy) {
        this.lockKey = lockKey;
        this.lockValue = lockValue;
        this.timeOut = timeOut;
        this.strategy = strategy;
        //初始化当前线程的重入次数
        lockCount = ThreadLocal.withInitial(AtomicInteger::new);
    }

    public void lock() throws Exception {
        Boolean getLock = RedisManager.setIfAbsent(lockKey, lockValue, timeOut);
        if (!getLock) {
            if (isLockOwner(lockKey)) {
                int count = lockCount.get().incrementAndGet();
                log.debug("重入锁[ {} ] 成功,当前LockCount: {}", lockKey, count);
                getLock = true;
            }
        }
        switch (strategy) {
            case RETRY:
                while (!getLock) {
                    log.debug("获取锁[ {}-{} ]失败", lockKey, lockValue);
                    getLock = RedisManager.setIfAbsent(lockKey, lockValue, timeOut);
                    Thread.sleep(SPIN_TIME);
                }
                log.debug("获取锁[ {}-{} ]成功", lockKey, lockValue);
                break;
            case ONCE:
                if (!getLock) {
                    throw new Exception("获取锁 " + lockKey + " 失败 , 退出方法");
                }
                log.debug("获取锁[ {}-{} ]成功", lockKey, lockValue);
                break;
            default:
                break;
        }
    }

    public void unlock() {
        int count = lockCount.get().get();
        if (count == 0) {
            if (execUnlockScript(lockKey, RedisReentrantLockUtils.getLockValue())) {
                log.debug("释放锁 [ {}-{} ] 成功", lockKey, RedisReentrantLockUtils.getLockValue());
            } else {
                log.debug("释放锁 [ {}-{} ] 失败", lockKey, RedisReentrantLockUtils.getLockValue());
            }
        } else {
            lockCount.get().decrementAndGet();
            log.debug("重入[ {} ] 锁 LockCount -1 ,当前lockCount : {}", lockKey, lockCount);
        }
    }

    /**
     * 使用lua脚本释放锁
     *
     * @param lockKey   锁键
     * @param lockValue 锁值
     */
    private Boolean execUnlockScript(String lockKey, String lockValue) {
        DefaultRedisScript unlockScript = new DefaultRedisScript();
        unlockScript.setResultType(Long.class);
        unlockScript.setScriptText(REDIS_UNLOCK_LUA);
        List<String> keys = Collections.singletonList(lockKey);
        return (Long) RedisManager.executeLuaScript(unlockScript, keys, lockValue) == REDIS_UNLOCK_SUCCESS;
    }

    /**
     * 是否锁的拥有者
     *
     * @param lockKey 锁键
     */
    private Boolean isLockOwner(String lockKey) {
        if (RedisManager.exists(lockKey)) {
            String lockValueJsonString = RedisManager.get(lockKey);
            JsonNode lockValue = JSON.parse(lockValueJsonString, JsonNode.class);
            assert lockValue != null;
            return RedisReentrantLockUtils.getMacAddress().equals(lockValue.get(RedisReentrantLockUtils.MAC).textValue()) &&
                    RedisReentrantLockUtils.getJvmId() == lockValue.get(RedisReentrantLockUtils.JVM).intValue() &&
                    RedisReentrantLockUtils.getThreadId() == lockValue.get(RedisReentrantLockUtils.THREAD).intValue();
        }
        return false;
    }

}

```

三、锁的守护线程

```java
/**
 * redis 分布式锁的守护线程，用于延长锁的有效期
 *
 * @Author: ZeroClian
 * @Date: 2021-12-09 3:14 下午
 */
@Slf4j
public class RedisReentrantLockDaemon implements Runnable {

    /**
     * 操作成功对比标志
     */
    private static final long REDIS_EXPIRE_SUCCESS = 1;

    /**
     * 锁键
     */
    private final String lockKey;
    /**
     * 锁值
     */
    private final String lockValue;
    /**
     * 过期时间
     */
    private final long timeOut;
    /**
     * 守护线程开关标志
     */
    private volatile Boolean signal;

    /**
     * 延时释放redis锁的Lua脚本
     */
    private final String REDIS_EXPIRE_LUA
            = " if redis.call('get',KEYS[1]) == ARGV[1] " +
            " then " +
            " return redis.call('expire',KEYS[1],ARGV[2]) " +
            " else " +
            " return 0 end";

    public RedisReentrantLockDaemon(String lockKey, String lockValue, long timeOut) {
        this.lockKey = lockKey;
        this.lockValue = lockValue;
        this.timeOut = timeOut;
        this.signal = true;
    }

    @Override
    public void run() {
        log.debug(">>>>>>守护线程启动");
        long waitTime = timeOut * 1000 * 2 / 3;
        while (signal) {
            try {
                Thread.sleep(waitTime);
                if (execExpandTimeScript(lockKey, lockValue, timeOut)) {
                    log.debug("锁 [ {} ] 延期成功", lockKey);
                } else {
                    log.debug("锁 [ {} ] 延期失败", lockKey);
                    this.stop();
                }
            } catch (InterruptedException e) {
                log.debug("锁 [ {} ] 的守护线程被中断", lockKey);
            }
        }
    }

    /**
     * 使用lua脚本进行过期时间延长
     */
    private Boolean execExpandTimeScript(String lockKey, String lockValue, long timeOut) {
        DefaultRedisScript unLockScript = new DefaultRedisScript();
        unLockScript.setResultType(Long.class);
        unLockScript.setScriptText(REDIS_EXPIRE_LUA);
        List<String> keys = Collections.singletonList(lockKey);
        return (Long) RedisManager.executeLuaScript(unLockScript, keys, lockValue, timeOut) == REDIS_EXPIRE_SUCCESS;
    }

    /**
     * 停止守护线程
     */
    private void stop() {
        this.signal = false;
    }
}

```

四、注解及aop处理

```java
/**
 * 分布式锁
 *
 * @Author: ZeroClian
 * @Date: 2021-12-09 11:03 上午
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface DistributeLock {

    String lockKey() default "";

    /**
     * 锁的有效时间，单位秒
     */
    long timeOut() default 60;

    /**
     * 使用第几个参数作为 key 的前缀
     */
    String param() default "";

    /**
     * 生成锁的key的策略，默认自定义key
     */
    LockKeyStrategy keyStrategy() default LockKeyStrategy.CUSTOM;

    /**
     * 获取锁的策略，默认进行自旋重试
     */
    LockStrategy strategy() default LockStrategy.RETRY;

}
```

```java

/**
 * @Author: ZeroClian
 * @Date: 2021-12-10 11:40 上午
 */
@Slf4j
@Aspect
@Component
public class DistributeLockAspect {

    /**
     * 初次重试间隔时间
     */
    private static final long RETRY_TIME = 1000;

    /**
     * 重试时间倍数
     */
    private static final long RETRY_TIME_MULTIPLE = 2;

    /**
     * 注解切点
     */
    @Pointcut()
    public void pointCut() {

    }

    @Around("@annotation(cn.github.zeroclian.distributedlock.annotation.DistributeLock)")
    public Object distributeLockAroundAop(ProceedingJoinPoint joinPoint) throws Throwable {
        // 获取注解
        DistributeLock distributeLock = RedisReentrantLockUtils.getDistributeLock(joinPoint);
        // 获取锁键
        String lockKey = RedisReentrantLockUtils.getLockKey(joinPoint);
        log.debug("分布式注解获取锁键:[ {} ]", lockKey);
        // 获取锁值
        String lockValue = RedisReentrantLockUtils.getLockValue();
        log.debug("分布式注解获取锁值:[ {} ]", lockValue);
        // 过期时间，避免死锁
        long timeOut = distributeLock.timeOut();
        // 获取锁的策略
        LockStrategy strategy = distributeLock.strategy();
        // 初始化锁
        RedisReentrantLock lock = new RedisReentrantLock(lockKey, lockValue, timeOut, strategy);
        // 初始化守护线程
        RedisReentrantLockDaemon daemon = new RedisReentrantLockDaemon(lockKey, lockValue, timeOut);
        Thread daemonThread = new Thread(daemon);
        try {
            lock.lock();
            daemonThread.setDaemon(Boolean.TRUE);
            daemonThread.start();
            return joinPoint.proceed();
        } finally {
            daemonThread.interrupt();
            lock.unlock();
        }
    }
}
```

五、相关策略类

```java
/**
 * 生成key的策略
 *
 * @Author: ZeroClian
 * @Date: 2021-12-09 10:00 上午
 */
public enum LockKeyStrategy {
    /**
     * 直接使用方法签名
     */
    METHOD,
    /**
     * 使用用户信息 + 方法签名
     */
    USER_METHOD,
    /**
     * 自定义
     */
    CUSTOM
}
```

```java
/**
 * @Author: qiyiguo
 * @Date: 2021-12-09 10:00 上午
 */
public enum LockStrategy {

    /**
     * 只尝试获取一次
     */
    ONCE,
    /**
     * 重复获取直到成功
     */
    RETRY
}
```

