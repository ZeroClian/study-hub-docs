# ArrayList源码分析

总所周知，ArrayList的数据结构是基于数组实现，其底层是一个Object数组列表，与我们普通定义的数组不同，它具有动态扩容、数据拷贝等操作。

接下来从初始化、插入、删除等源码来分析ArrayList是如何具体实现这些操作的

## 初始化

```Java
//默认容量
private static final int DEFAULT_CAPACITY = 10;

private static final Object[] EMPTY_ELEMENTDATA = {};

private static final Object[] DEFAULTCAPACITY_EMPTY_ELEMENTDATA = {};

public ArrayList(int initialCapacity) {
    if (initialCapacity > 0) {
        //创建Object数组
        this.elementData = new Object[initialCapacity];
    } else if (initialCapacity == 0) {
        this.elementData = EMPTY_ELEMENTDATA;
    } else {
        throw new IllegalArgumentException("Illegal Capacity: "+
                                           initialCapacity);
    }
}

public ArrayList() {
    this.elementData = DEFAULTCAPACITY_EMPTY_ELEMENTDATA;
}
```

从源码可以看出，**EMPTY_ELEMENTDATA**是一个定义好的空对象，当无参或者大小为0时，将会得到一个Object[]的空对象。

常用的构造方式

- 普通方式

```java
ArrayList<String> list = new ArrayList<String>();
list.add("a");
list.add("b");
list.add("c");
```

- Arrays.asList 方式

```java
ArrayList list = new ArrayList(Arrays.asList("a","b","c"));
```

- Collections.nCopies 方式

```java
ArrayList<String> list = new ArrayList<String>(Collections.nCopies(3,"a"));
```

Collections.nCopies 是集合方法中用于生成多少份某个指定元素的方法。

## 插入

```java
public boolean add(E e) {
    ensureCapacityInternal(size + 1);  // Increments modCount!!
    elementData[size++] = e;
    return true;
}
```

从源码中，可以看出，插入时分两步：

- 第一步：判断容量是否足够，不足则扩容
- 第二步：将元素插入，size自增

扩容源码：

```Java
private void ensureCapacityInternal(int minCapacity) {
    if (elementData == DEFAULTCAPACITY_EMPTY_ELEMENTDATA) {
        minCapacity = Math.max(DEFAULT_CAPACITY, minCapacity);
    }

    ensureExplicitCapacity(minCapacity);
}

private void ensureExplicitCapacity(int minCapacity) {
    modCount++;

    // overflow-conscious code
    if (minCapacity - elementData.length > 0)
        grow(minCapacity);
}
private void grow(int minCapacity) {
    // overflow-conscious code
    int oldCapacity = elementData.length;
    int newCapacity = oldCapacity + (oldCapacity >> 1);
    if (newCapacity - minCapacity < 0)
        newCapacity = minCapacity;
    if (newCapacity - MAX_ARRAY_SIZE > 0)
        newCapacity = hugeCapacity(minCapacity);
    // minCapacity is usually close to size, so this is a win:
    elementData = Arrays.copyOf(elementData, newCapacity);
}
```

核心扩容方法是调用grow方法，扩容后长度为` oldCapacity + (oldCapacity >> 1)`，即为原来的1.5倍。数组元素的拷贝使用的`Arrays.copyOf(elementData, newCapacity)`，其底层采用的`System.arraycopy`。

指定位置插入同理：

- 判断size是否可以插入
- 判断插入后是否需要扩容
- 数据迁移，把从待插入位置后面的元素顺序往后迁移
- 给指定位置赋值

```java
public void add(int index, E element) {
    rangeCheckForAdd(index);

    ensureCapacityInternal(size + 1);  // Increments modCount!!
    System.arraycopy(elementData, index, elementData, index + 1,
                     size - index);
    elementData[index] = element;
    size++;
}
```

## 删除

```java
public E remove(int index) {
    rangeCheck(index);

    modCount++;
    E oldValue = elementData(index);

    int numMoved = size - index - 1;
    if (numMoved > 0)
        System.arraycopy(elementData, index+1, elementData, index,
                         numMoved);
    elementData[--size] = null; // clear to let GC do its work

    return oldValue;
}
```

- 校验是否越界：`rangeCheck(index)`
- 计算删除元素的移动长度`numMoved`，并通过`System.arraycopy`复制元素给自己
- 结尾元素清空，null

## 扩展

> 如果给你一组元素；a、b、c、d、e、f、g，需要你放到 ArrayList 中，但是要求 获取一个元素的时间复杂度都是 O(1)，你怎么处理？

想解决这个问题，就需要知道元素添加到集合中后知道它的位置，而这个位置呢， 其实可以通过哈希值与集合长度与运算，得出存放数据的下标，如下图；

![image-20210421134406953](https://cdn.jsdelivr.net/gh/ZeroClian/picture/img/image-20210421134406953.png)

- 如图就是计算出每一个元素应该存放的位置，这样就可以 O(1)复杂度获取元素。

