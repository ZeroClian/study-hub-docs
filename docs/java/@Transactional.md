## @Transactional注解失效的场景
### propagation设置问题

- `PROPAGATION_SUPPORTS`：如果上下文中存在事务则加入当前事务，如果没有事务则以非事务方式执行。

- `PROPAGATION_NOT_SUPPORTED`：当上下文中有事务则挂起当前事务，以非事务方式执行完当前逻辑后再恢复上下文事务。

- `PROPAGATION_NEVER`：该传播级别要求上下文中不能存在事务，否则抛出异常。

### 使用在非public方法上

注解，本质上是通过AOP来完成的，`cglib动态代理`会把你当前执行方法的前后加上切面,切面的方法里在我们的方法是非public的时候，会直接返回null，所以当我们把注解加在非public方法上面时，@Transactional注解会失效。

`cglib动态代理`跟`jdk动态代理`的区别是jdk动态代理通过`反射`的方式来实现动态代理，而cglib使用的是`继承后再通过修改字节码`的方式来实现的。所以在使用cglib动态代理的时候，要求被代理的类不能是final的，因为如果一个类被标记为`final`的时候，我们就无法继承它了。

同样的道理，我们如果一个方法`不是非public`的，我们就无法覆盖这个方法，那就也就无法在这个方法前后添加切面了！*同时这种注解失效的类型编译器也不会报错，编译过程也不会报错，也无法马上注意到注解失效了*，这种情况需要注意一下。

### rollbackFor 设置问题
@Transactional注解的默认情况下是只有在`RuntimeException`的情况下才会回滚的,因此**需要保证业务异常类是rollbackFor参数中类的子类就可以**

### 注解加在方法内部调用的方法中
一个A类里面分别有两个function，分别是functionA，functionB，在functionA中调用的functionB，functionA中没有声明事务，而在functionB中声明了事务，此时在外部调用functionA时，functionB的事务是不会生效的。

因为`SpringAOP`只有我们的事务方法在被`当前类以外的方法调用`时，Spring才会生成代理对象。

> 最后一种情况：数据库引擎不支持事务