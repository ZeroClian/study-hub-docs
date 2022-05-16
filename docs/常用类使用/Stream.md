
## 聚合方法
`count()`：返回Stream中元素的size大小。

`forEach()`：通过内部循环Stream中的所有元素，对每一个元素进行消费，此方法没有返回值。

`forEachOrder()`：和上面方法的效果一样，但是这个可以保持消费顺序，哪怕是在多线程环境下。

`anyMatch(Predicate predicate)`：这是一个短路操作，通过传入断言参数判断是否有元素能够匹配上断言。

`allMatch(Predicate predicate)`：这是一个短路操作，通过传入断言参数返回是否所有元素都能匹配上断言。

`noneMatch(Predicate predicate)`：这是一个短路操作，通过传入断言参数判断是否所有元素都无法匹配上断言，如果是则返回true，反之则false。

`findFirst()`：这是一个短路操作，返回Stream中的第一个元素，Stream可能为空所以返回值用Optional处理。

`findAny()`：这是一个短路操作，返回Stream中的任意一个元素，串型流中一般是第一个元素，Stream可能为空所以返回值用Optional处理。

## 归约
###  reduce
使用：反复求值

> 将一个Stream中的所有元素反复结合起来，得到一个结果，这样的操作被称为归约。

```java
Optional<Integer> reduce = List.of(1, 2, 3).stream().reduce((i1, i2) -> i1 + i2);
```
增加一个初始值，这样哪怕stream流没有元素也会返回一个默认值
```java
Integer reduce = List.of(1, 2, 3).stream().reduce(0, (i1, i2) -> i1 + i2);
```
###  max、min
参数为自定义排序规则
```java
Optional<Integer> max = List.of(1, 2, 3).stream().max(Integer::compare);
Optional<Integer> max = List.of(1, 2, 3).stream().min(Integer::compare);
```

## 收集器
定义：`<R, A> R collect(Collector<? super T, A, R> collector);`

### 集合：
```java
// toList
List.of(1, 2, 3).stream().collect(Collectors.toList());

// toUnmodifiableList：集合不可以改变元素
List.of(1, 2, 3).stream().collect(Collectors.toUnmodifiableList());

// toSet
List.of(1, 2, 3).stream().collect(Collectors.toSet());

// toUnmodifiableSet：集合不可以改变元素
List.of(1, 2, 3).stream().collect(Collectors.toUnmodifiableSet());

```

### Map：
```java
Map<Integer, User> map = users.stream().collect(Collectors.toMap(User::getUserId, user -> user));
```
toMap() 具有两个参数：

- 第一个参数代表key，它表示你要设置一个Map的`key`，我这里指定的是元素中的`userId`。

- 第二个参数代表value，它表示你要设置一个Map的`value`，我这里直接把元素本身当作值，所以结果是一个`Map<Integer, User>`。

toMap() 还有两个伴生方法：

- `toUnmodifiableMap()`：返回一个不可修改的Map。

- `toConcurrentMap()`：返回一个线程安全的Map。

### 分组
当key为重复值，并且想分类湿，应该使用groupingBy 而不是toMap。
```java
Map<Integer, List<Order>> collect = orders.stream().collect(Collectors.groupingBy(Order::getOrderType));
```
自动按照此属性进行分组，并将分组的结果收集为一个List
```java
Map<Integer, Set<Order>> collect = orders.stream().collect(Collectors.groupingBy(Order::getOrderType, toSet()));
```
groupingBy还提供了一个重载，让你可以自定义收集器类型，所以它的第二个参数是一个Collector收集器对象。

对于Collector类型，我们一般还是使用Collectors类，这里由于我们前面已经使用了Collectors，所以这里不必声明直接传入一个toSet()方法，代表我们将分组后的元素收集为Set。

groupingBy还有一个相似的方法叫做groupingByConcurrent()，这个方法可以在并行时提高分组效率，但是它是不保证顺序的，这里就不展开讲了。

### 分区
将数据按照TRUE或者FALSE进行分组就叫做分区。
```java
//按照是否支付分区
Map<Boolean, List<Order>> collect = orders.stream().collect(Collectors.partitioningBy(Order::getIsPaid)); 
```
具有一个重载方法，用来自定义收集器类型
```java
Map<Boolean, Set<Order>> collect = orders.stream().collect(Collectors.partitioningBy(Order::getIsPaid, toSet()));
```
### joining
```java
String collect = orders.stream().map(Order::getOrderNo).collect(Collectors.joining("，"));
```