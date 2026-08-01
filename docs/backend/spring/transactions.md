---
title: Spring 事务与 @Transactional
description: Transactional 注解失效的常见场景。
---

# Spring 事务与 @Transactional

集中记录声明式事务使用时容易忽略的边界条件。

## @Transactional注解失效的场景
### propagation设置问题

- `PROPAGATION_SUPPORTS`：如果上下文中存在事务则加入当前事务，如果没有事务则以非事务方式执行。

- `PROPAGATION_NOT_SUPPORTED`：当上下文中有事务则挂起当前事务，以非事务方式执行完当前逻辑后再恢复上下文事务。

- `PROPAGATION_NEVER`：该传播级别要求上下文中不能存在事务，否则抛出异常。

### 使用在非public方法上

基于代理的 Spring AOP 只会拦截通过代理对象进入的调用。`@Transactional` 通常应放在 `public` 方法上；`private`、`final` 方法无法被基于子类的代理覆盖，接口代理也只能拦截接口方法。不要把事务方法当作普通方法在同一个类中直接调用，否则会绕过代理。

JDK 动态代理基于接口，CGLIB/Byte Buddy 等子类代理基于继承；具体代理技术由 Spring 版本和配置决定，因此不应把“切面方法返回 null”作为失效原因。

### rollbackFor 设置问题
`@Transactional` 默认对 `RuntimeException` 和 `Error` 回滚，对受检异常通常不回滚。业务方法可能抛出受检异常时，应显式指定例如 `@Transactional(rollbackFor = Exception.class)`，并确认异常没有被提前捕获。

### 注解加在方法内部调用的方法中
一个A类里面分别有两个function，分别是functionA，functionB，在functionA中调用的functionB，functionA中没有声明事务，而在functionB中声明了事务，此时在外部调用functionA时，functionB的事务是不会生效的。

因为`SpringAOP`只有我们的事务方法在被`当前类以外的方法调用`时，Spring才会生成代理对象。

> 最后一种情况：数据库引擎不支持事务
