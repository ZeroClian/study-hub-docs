---
title: 链表、栈与队列
description: Java 数据结构练习：链表、栈和队列。
---

# 链表、栈与队列

将原先分散的数据结构题目集中整理，便于按结构类型复习。

## 栈与队列

### [剑指 Offer 09. 用两个栈实现队列](https://leetcode.cn/problems/yong-liang-ge-zhan-shi-xian-dui-lie-lcof/?envType=study-plan&id=lcof)

```java
class CQueue {
    Deque<Integer> inStack;
    Deque<Integer> outStack;
    public CQueue() {
        inStack = new ArrayDeque<>();
        outStack = new ArrayDeque<>();
    }

    public void appendTail(int value) {
        inStack.push(value);
    }

    public int deleteHead() {
        if (inStack.isEmpty() && outStack.isEmpty()){
            return -1;
        }
        if (!outStack.isEmpty()){
            return outStack.pop();
        }
        while (!inStack.isEmpty()){
            outStack.push(inStack.pop());
        }
        return outStack.pop();
    }
}
```

### [剑指 Offer 30. 包含min函数的栈](https://leetcode.cn/problems/bao-han-minhan-shu-de-zhan-lcof/?envType=study-plan&id=lcof)

```java
class MinStack {

    private Deque<Integer> data;
    private Deque<Integer> min;

    public MinStack() {
        data = new ArrayDeque<>();
        min = new ArrayDeque<>();
        min.push(Integer.MAX_VALUE);
    }

    public void push(int x) {
        data.push(x);
        min.push(Math.min(x,min.peek()));
    }

    public void pop() {
        min.pop();
        data.pop();
    }

    public int top() {
        return data.peek();
    }

    public int min() {
        return min.peek();
    }
}
```

## 链表

###  [剑指 Offer 06. 从尾到头打印链表](https://leetcode.cn/problems/cong-wei-dao-tou-da-yin-lian-biao-lcof/?envType=study-plan&id=lcof)

```java
class Solution {
    public int[] reversePrint(ListNode head) {
        int len = 0;
            ListNode init = head;
            while (null != head) {
                len++;
                head = head.next;
            }
            int[] ans = new int[len];
            for (int i = 0; i < len; i++) {
                ans[len - i - 1] = init.val;
                init = init.next;
            }
            return ans;
    }
}
```
