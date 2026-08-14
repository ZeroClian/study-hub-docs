---
title: Java 开发者的 Swift 与 SwiftUI 对照手册
description: 面向零 iOS 基础的 Java 后端开发者，用 Java 心智模型理解 Swift 语法、SwiftUI 数据流与常见陷阱。
---

# Java 开发者的 Swift 与 SwiftUI 对照手册

这篇文档不是把 Swift 语法从头到尾抄一遍，而是给 Java 后端开发者一张“读懂 iOS 项目”的地图。第一次阅读时建议按顺序看；以后阅读项目代码时，可以直接搜索关键字，例如 `Optional`、`@State`、`some View` 或 `Task`。

本文以现代 Swift 与 SwiftUI 为主。`@Observable` 需要 iOS 17、iPadOS 17、macOS 14 等相应系统版本；维护旧项目时仍会遇到 `ObservableObject`、`@Published`、`@StateObject` 和 `@ObservedObject`。具体可用版本始终以项目的 Deployment Target 和当前 Xcode SDK 为准。

官方入口：[The Swift Programming Language](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/)、[SwiftUI](https://developer.apple.com/documentation/swiftui/)、[Develop in Swift Tutorials](https://developer.apple.com/tutorials/develop-in-swift/)。

## 1. 先建立 Java 到 Swift 的心智映射

| Java 中的概念 | Swift / SwiftUI 中常见写法 | 最重要的差异 |
| --- | --- | --- |
| `final` 局部变量 | `let` | `let` 表示绑定不能再次赋值；若绑定的是类实例，实例内部的 `var` 仍可能变化 |
| 普通变量 | `var` | Swift 鼓励默认使用 `let`，确认需要变化时才改成 `var` |
| `null` | `Optional`，例如 `String?` | 非 Optional 类型不能为 `nil`，缺失值必须显式处理 |
| POJO / record | 通常是 `struct` | `struct` 是值类型，赋值和传参在语义上是复制，不是共享同一对象 |
| 普通对象 | `class` | `class` 是引用类型，由 ARC 管理生命周期 |
| interface | `protocol` | `struct`、`enum`、`class` 都能遵循协议；协议扩展还能提供默认实现 |
| enum | `enum` | Swift 枚举能携带不同类型的关联值，常用来表达状态机 |
| checked / unchecked exception | `throws`、`try`、`do-catch` | Swift 没有 Java 式 checked exception 类型签名体系；调用点仍必须显式写 `try` |
| lambda | closure：`{ value in ... }` | 闭包尾随语法非常普遍，并且会捕获上下文 |
| `CompletableFuture` / Reactor | `async` / `await`、`Task`、actor | `async` 不等于“新建线程”，`await` 是潜在挂起点 |
| Spring 注入或上下文 | SwiftUI `@Environment` | 是沿视图树传播的值，不是通用 IoC 容器 |
| MVC Controller 更新控件 | SwiftUI 的状态驱动视图 | 修改状态，SwiftUI 重新求值受影响的 `body`，不要手工“刷新控件” |

官方依据：[Swift 基础](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/)、[结构体与类](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/classesandstructures/)、[SwiftUI Model data](https://developer.apple.com/documentation/swiftui/model-data)。

## 2. Swift 语法：先掌握读项目必需的部分

### 2.1 文件、模块与访问控制

Swift 文件通常不要求“文件名必须等于 public 类名”，一个 `.swift` 文件可以声明多个类型、函数和扩展。Xcode 的一个 app 或 framework target 通常对应一个 Swift module，通过 `import` 导入模块：

```swift
import Foundation
import SwiftUI
```

常见访问级别从宽到窄大致是：

- `open`：其他模块可访问，也可继承或重写，仅适用于类及可重写成员。
- `public`：其他模块可访问，但不自动允许外部继承或重写。
- `package`：同一 Swift package 内可见。
- `internal`：同一 module 内可见，也是大多数声明的默认值。
- `fileprivate`：同一源文件内可见。
- `private`：封闭声明及同文件相关扩展的受限范围内可见。

Java 开发者注意：Swift app 内的类型没写 `public` 并不等于 Java 的 package-private，而通常是整个 target/module 内可见。

官方依据：[Access Control](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/accesscontrol/)。

### 2.2 `let`、`var`、类型推断与基础类型

```swift
let serviceName = "article"        // 推断为 String，不能重新赋值
var retryCount = 0                 // 推断为 Int，可以修改
let timeout: Double = 1.5          // 显式类型
let enabled = true                 // Bool
let message = "retry: \(retryCount)" // 字符串插值

retryCount += 1
```

对照 Java：

```java
final String serviceName = "article";
int retryCount = 0;
double timeout = 1.5;
String message = "retry: " + retryCount;
```

必须记住的差异：

- Swift 通常不写分号。
- 类型推断发生在编译期，不是 JavaScript 式动态类型。
- Swift 不做随意的隐式数字转换，例如 `Int + Double` 不能直接编译，要显式 `Double(count)`。
- `String`、`Int`、`Bool`、`Array` 等在 Swift 中都是值类型，不是“有的 primitive、有的 object”这套 Java 二分法。
- Swift `String` 按 Unicode 字符建模，不能假设任意字符都能用整数下标访问。

```swift
let count = 3
let price = 2.5
let total = Double(count) * price

let text = "你好👋"
let firstCharacter = text[text.startIndex]
```

`let` 的细微差异：

```swift
struct Point {
    var x: Int
}

final class Counter {
    var value = 0
}

let point = Point(x: 1)
// point.x = 2 // 编译错误：整个值被冻结

let counter = Counter()
counter.value = 1       // 可以：引用不能换，实例内部仍可变
// counter = Counter()  // 编译错误：不能重新绑定
```

这与 Java 的 `final Counter counter` 很像，但 `let` 绑定值类型时限制更强。

官方依据：[The Basics](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/)、[Strings and Characters](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/stringsandcharacters/)。

### 2.3 Optional：把“可能没有值”写进类型

`String` 保证有字符串；`String?` 表示“有一个 `String`，或者没有值”。`T?` 是 `Optional<T>` 的语法糖，而 `Optional` 本质上是带 `.some(T)` 和 `.none` 两种情况的枚举。

```swift
let rawAge = "18"
let age: Int? = Int(rawAge) // 转换可能失败，所以返回 Int?
```

优先使用以下安全写法：

```swift
// 1. if let：只在有值时进入
if let age {
    print("age = \(age)")
}

// 2. guard let：不满足条件时提前退出，适合函数主流程
func register(name: String?) {
    guard let name, !name.isEmpty else {
        return
    }
    print("register \(name)")
}

// 3. ??：提供默认值
let displayName: String = optionalName ?? "匿名用户"

// 4. ?.：可选链；任一环节为 nil，整体得到 nil
let city: String? = user?.address?.city

// 5. map：对存在的值做转换
let cityLength: Int? = city.map { $0.count }
```

谨慎或避免：

```swift
let forcedAge = age!       // age 为 nil 时运行时崩溃
let result = try! load()   // 抛错时运行时崩溃
```

Java 开发者最容易踩的坑：

- `!` 不是 Java 的逻辑非；后缀 `value!` 是“我保证不为 nil”的强制解包。
- `String!` 是隐式解包 Optional，常见于部分旧 UIKit API，不代表永远安全。
- 字典下标返回 Optional，因为 key 可能不存在：`scores["Alice"]` 的类型是 `Int?`。
- 多层 `T??` 确实可能出现；不要看到 `nil` 就机械地强制解包。
- `Optional` 适合表示“没有值”；需要携带失败原因时使用 `throws` 或 `Result`。

官方依据：[The Basics - Optionals](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/#Optionals)、[Types - Optional Type](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/types/#Optional-Type)、[Optional Chaining](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/optionalchaining/)。

### 2.4 条件、循环、`guard` 与模式匹配

```swift
for index in 0..<3 {        // 0、1、2；半开区间
    print(index)
}

for index in 1...3 {        // 1、2、3；闭区间
    print(index)
}

if retryCount > 3 {
    print("stop")
} else {
    print("continue")
}
```

Swift 的 `switch` 必须穷尽所有可能，而且天然支持模式匹配，不会像 Java/C 那样默认 fall-through：

```swift
enum LoadState {
    case idle
    case loading
    case loaded(count: Int)
    case failed(message: String)
}

func render(_ state: LoadState) -> String {
    switch state {
    case .idle:
        return "未开始"
    case .loading:
        return "加载中"
    case .loaded(let count):
        return "共 \(count) 条"
    case .failed(let message):
        return "失败：\(message)"
    }
}
```

`guard` 要求失败分支离开当前作用域，常用 `return`、`throw`、`break` 或 `continue`。它的价值是减少深层嵌套，而不是一种新的异常机制。

官方依据：[Control Flow](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/controlflow/)、[Enumerations](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/enumerations/)。

### 2.5 函数、参数标签与闭包

#### 函数

```swift
func greet(_ name: String, from city: String = "上海") -> String {
    "你好，\(name)，来自 \(city)"
}

greet("Justin")
greet("Justin", from: "北京")
```

逐段阅读：

- `_ name`：调用时不写第一个参数标签，函数内部变量名是 `name`。
- `from city`：调用处写 `from:`，函数内部使用 `city`。
- `= "上海"`：默认参数；Java 本身没有同等语法，通常要靠重载。
- `-> String`：返回类型。
- 单表达式函数可省略 `return`。

Swift 函数参数默认不能在函数内改写。确实要修改调用者的变量时可以使用 `inout`，调用处必须加 `&`：

```swift
func increment(_ value: inout Int) {
    value += 1
}

var count = 0
increment(&count)
```

不要把 `inout` 当作 Java 对象引用传参的直接翻版；Swift 官方定义的是 copy-in/copy-out 语义，编译器可以优化其实现。

#### 闭包

```swift
let names = ["Bob", "Alice", "Charlie"]

let sorted1 = names.sorted(by: { (left: String, right: String) -> Bool in
    return left < right
})

let sorted2 = names.sorted { $0 < $1 }
```

`sorted2` 同时使用了类型推断、尾随闭包、简写参数 `$0/$1` 和单表达式隐式返回。读项目代码时可以先把它“展开”为 `sorted1` 再理解。

接收并保存闭包、让它在函数返回后执行时，参数通常要标记为 `@escaping`：

```swift
final class Loader {
    private var completion: (() -> Void)?

    func onFinished(_ action: @escaping () -> Void) {
        completion = action
    }
}
```

闭包会捕获外部变量。捕获类实例的 `self` 时要留意 ARC 循环引用，尤其是“对象强持有闭包、闭包又强持有对象”的情况。

官方依据：[Functions](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/functions/)、[Closures](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/closures/)。

### 2.6 属性、初始化器与 `self`

```swift
struct User {
    let id: Int                         // 存储属性
    var firstName: String
    var lastName: String

    var fullName: String {              // 只读计算属性，不额外存储
        "\(firstName) \(lastName)"
    }

    init(id: Int, firstName: String, lastName: String) {
        self.id = id
        self.firstName = firstName
        self.lastName = lastName
    }
}
```

Swift 要求实例完成初始化前，所有存储属性都有值。其他常见形式：

- `lazy var`：第一次读取时初始化；必须是 `var`。
- `static let/var`：类型属性，对应 Java 的静态成员。
- `willSet` / `didSet`：属性将要/已经赋值时的观察器。
- `private(set) var`：外部可读，但只有受限范围内可写。
- `mutating func`：结构体或枚举的方法需要修改自身时必须声明。

Java 开发者注意：结构体在满足条件时会获得成员逐一初始化器，但一旦自定义初始化规则、访问级别或跨 module 使用，能否直接调用该初始化器需要重新确认，不要把它当作 Lombok 永久生成的公开构造器。

官方依据：[Properties](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/properties/)、[Initialization](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/initialization/)、[Methods](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/methods/)。

### 2.7 `struct`、`class`、`enum`、`protocol` 与 `extension`

#### `struct`：优先考虑的值类型

```swift
struct Article: Identifiable, Hashable {
    let id: Int
    var title: String
    var isRead: Bool

    mutating func markAsRead() {
        isRead = true
    }
}
```

适合纯数据、小型业务值、配置和 SwiftUI `View`。它可以有属性、方法、初始化器、泛型并遵循协议，不是 Java 中“只能装字段”的低能力结构。

#### `class`：需要共享身份或继承时使用

```swift
class BaseRepository {
    func load() async throws -> [Article] { [] }
}

final class RemoteRepository: BaseRepository {
    override func load() async throws -> [Article] {
        try await super.load()
    }
}
```

类支持继承、引用身份、`deinit` 和 ARC。没有继承需要时常写 `final class`，让意图更清楚。

#### `enum`：不仅是整数常量

```swift
enum ApiResult<Value> {
    case success(Value)
    case failure(statusCode: Int, message: String)
}
```

关联值让枚举能表达 Java 中常需 sealed interface + 多个 record 才能表达的状态。`switch` 穷尽检查能帮助新增 case 后找到遗漏分支。

#### `protocol`：能力契约

```swift
protocol ArticleRepository {
    func fetchArticles() async throws -> [Article]
}

extension ArticleRepository {
    func fetchFirst() async throws -> Article? {
        try await fetchArticles().first
    }
}
```

协议不等于“只能由 class 实现的 Java interface”；值类型也能遵循协议。协议扩展可提供默认实现。若希望通过协议类型进行多态分派，应把关键成员声明为协议 requirement，而不是只在 extension 中额外定义同名方法。

#### `extension`：给已有类型增加能力或协议遵循

```swift
extension Article {
    var displayTitle: String {
        isRead ? title : "[未读] \(title)"
    }
}
```

extension 可以增加计算属性、方法、初始化器、嵌套类型和协议遵循，但不能增加存储属性，也不能覆盖已有实现。它常用于按协议或功能拆分同一类型的代码。

官方依据：[Structures and Classes](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/classesandstructures/)、[Enumerations](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/enumerations/)、[Protocols](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/protocols/)、[Extensions](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/extensions/)。

### 2.8 值语义、引用语义与相等判断

```swift
struct ProfileValue {
    var name: String
}

final class ProfileReference {
    var name: String
    init(name: String) { self.name = name }
}

var valueA = ProfileValue(name: "A")
var valueB = valueA
valueB.name = "B"
// valueA.name 仍是 "A"

let refA = ProfileReference(name: "A")
let refB = refA
refB.name = "B"
// refA.name 也变为 "B"
```

判断方式：

- `==` / `!=`：值是否相等，需要 `Equatable`。
- `===` / `!==`：两个引用是否指向同一个类实例，仅适用于 class。

Swift 标准库的 `String`、`Array`、`Set`、`Dictionary` 等是值类型，并使用 copy-on-write 等优化避免每次赋值都立即复制全部存储。你应依赖它们的值语义，不要依赖内部优化细节。

Java 开发者注意：把含有数组的 struct 传给函数后修改副本，原值通常不会变化；这和把 `ArrayList` 引用传给 Java 方法完全不同。

官方依据：[Structures and Classes - Value and Reference Types](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/classesandstructures/#Structures-and-Enumerations-Are-Value-Types)。

### 2.9 集合与函数式操作

```swift
var articles: [Article] = []                 // Array<Article>
var tags: Set<String> = ["Swift", "iOS"]
var scores: [String: Int] = ["Alice": 100] // Dictionary<String, Int>

articles.append(Article(id: 1, title: "Optional", isRead: false))
tags.insert("SwiftUI")
scores["Bob"] = 90

let unreadTitles = articles
    .filter { !$0.isRead }
    .map(\.title)

let total = scores.values.reduce(0, +)
```

与 Java Stream 对照：

```java
List<String> unreadTitles = articles.stream()
    .filter(article -> !article.isRead())
    .map(Article::title)
    .toList();
```

易错点：

- `let array` 不能增加、删除或替换元素；`let list = new ArrayList<>()` 在 Java 中仍可修改 list 内容。
- 数组越界会触发运行时错误，不会返回 Optional。
- 字典无承诺的稳定顺序，需要顺序时显式 `sorted`。
- `map(\.title)` 使用 KeyPath；可先把它理解为更短的 `.map { $0.title }`。
- `compactMap` 会转换并丢弃 `nil`，接近 Java 的 `map` 后过滤空值。

官方依据：[Collection Types](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/collectiontypes/)。

### 2.10 泛型、`some` 与 `any`

```swift
func first<T>(_ values: [T]) -> T? {
    values.first
}

func printIDs<C: Collection>(_ values: C) where C.Element: Identifiable {
    for value in values {
        print(value.id)
    }
}
```

读 SwiftUI 时最常见的是 `some View`：它表示返回某一个确定但对调用者隐藏的具体类型，该具体类型遵循 `View`。它不是 Java 的 `View` 接口引用，也不是“每次可返回任意不同类型”。

```swift
func makeTitle() -> some View {
    Text("标题") // 底层具体类型仍确定为 Text
}
```

`any Protocol` 表示装箱后的协议存在类型，可以在运行时容纳不同的具体遵循者：

```swift
let repositories: [any ArticleRepository] = [RemoteArticleRepository()]
```

粗略对照：

- 泛型 `T: Protocol`：调用者与编译器保留具体类型信息。
- `some Protocol`：具体类型存在且固定，但 API 隐藏它。
- `any Protocol`：运行时容器可持有不同具体类型，带来动态分派/装箱边界。

官方依据：[Generics](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/generics/)、[Opaque and Boxed Protocol Types](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/opaquetypes/)。

### 2.11 错误处理：`throws`、`try`、`do-catch` 与 `Result`

```swift
enum ArticleError: Error {
    case unauthorized
    case invalidResponse(statusCode: Int)
}

func fetch() async throws -> [Article] {
    throw ArticleError.unauthorized
}

func refresh() async {
    do {
        let articles = try await fetch()
        print(articles.count)
    } catch ArticleError.unauthorized {
        print("请登录")
    } catch ArticleError.invalidResponse(let statusCode) {
        print("HTTP \(statusCode)")
    } catch {
        print("未知错误：\(error)")
    }
}
```

三种 `try` 必须分清：

- `try expression`：错误继续抛出或由外层 `do-catch` 处理。
- `try? expression`：把错误丢弃并转换为 Optional，失败得到 `nil`。
- `try! expression`：断言不会失败，实际失败时崩溃。

`defer` 在当前作用域离开前执行，适合成对清理资源：

```swift
func useResource() throws {
    openResource()
    defer { closeResource() }
    try doWork()
}
```

与 Java 的差异：

- Swift 的 `Error` 接近错误能力协议，没有 Java `Exception` 类层次的强制形态。
- 普通 `throws` 不会像 Java 方法签名那样列出一组 checked exception 类型；调用方知道“可能抛错”，未必从签名知道全部 case。
- `Result<Success, Failure>` 适合把成功/失败当作值保存或通过回调传递；在自然的异步调用链里通常优先 `async throws`。
- 不要用 `try?` 吞掉需要展示、记录或分类的业务错误。

官方依据：[Error Handling](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/)、[Control Flow - Deferred Actions](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/controlflow/#Deferred-Actions)。

### 2.12 并发：`async/await`、`Task`、actor 与 `@MainActor`

最小调用链：

```swift
func fetchArticle(id: Int) async throws -> Article {
    // 真正项目里通常调用 URLSession 等异步 API
    Article(id: id, title: "Swift Concurrency", isRead: false)
}

func showArticle() async {
    do {
        let article = try await fetchArticle(id: 1)
        print(article.title)
    } catch {
        print(error)
    }
}
```

核心语义：

- `async` 表示函数可能挂起，不表示它自动在后台线程执行。
- `await` 标记潜在挂起点；挂起 task 不等于阻塞底层线程。
- `Task { ... }` 从同步位置启动异步工作，并通常继承当前优先级、task-local 值和 actor 上下文。
- `async let` 适合数量固定的并行子任务；task group 适合动态数量。
- 结构化并发让父子 task 形成层次，优先于随处创建无管理的 task。
- 取消是协作式的；任务应检查取消状态，抛出 `CancellationError` 或调用可取消的挂起 API。

```swift
async let article = fetchArticle(id: 1)
async let related = fetchArticle(id: 2)
let pair = try await (article, related)
```

actor 用串行隔离保护可变状态：

```swift
actor ArticleCache {
    private var storage: [Int: Article] = [:]

    func article(id: Int) -> Article? {
        storage[id]
    }

    func save(_ article: Article) {
        storage[article.id] = article
    }
}

let cached = await cache.article(id: 1)
```

`@MainActor` 用于隔离 UI 相关状态：

```swift
@MainActor
final class ArticleStore {
    private(set) var articles: [Article] = []

    func replace(with newValue: [Article]) {
        articles = newValue
    }
}
```

Java 开发者最需要修正的直觉：

- `@MainActor` 不是给每个方法加 `synchronized`；它把隔离的工作安排到全局 main actor。
- actor 防止对其隔离状态的数据竞争，不代表一整个异步方法期间“永不重入”；跨越 `await` 后状态可能已被其他工作改变。
- `Task {}` 不是 `new Thread(...)`，也不保证离开主 actor。CPU 密集工作不应因为包进 `Task {}` 就被认为已转后台。
- 从非 main actor 上下文更新 UI/界面模型，应切换到 main actor，例如调用 `@MainActor` 方法或 `await MainActor.run { ... }`。
- 不要默认使用 `Task.detached`；它切断部分结构化上下文，适用范围较窄。

官方依据：[Concurrency](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/)、[MainActor](https://developer.apple.com/documentation/swift/mainactor)。

### 2.13 ARC：自动管理引用，不等于没有内存问题

Swift 使用 Automatic Reference Counting 管理 class 实例的生命周期。强引用计数归零后实例可被释放，但强引用环会让计数永远无法归零。

```swift
final class Owner {
    var onFinished: (() -> Void)?

    func start() {
        onFinished = { [weak self] in
            self?.finish()
        }
    }

    private func finish() {}
}
```

引用选择：

- 默认强引用：对象应被持有时使用。
- `weak`：不增加强引用计数，对象释放后自动变为 `nil`，因此通常必须是 `var` Optional。
- `unowned`：不增加强引用计数，但假定引用使用期间对象一定存在；对象已释放后再访问会出错。
- 闭包捕获列表 `[weak self]`：常用于打破对象与逃逸闭包之间的循环。

与 Java GC 的差异：GC 通常能回收不可达的引用环；ARC 依赖引用计数，强引用环本身就会泄漏。另一方面，不要机械地给所有闭包都加 `[weak self]`，否则可能让必要工作因 `self` 提前释放而静默不执行；先判断持有关系和闭包寿命。

官方依据：[Automatic Reference Counting](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/)。

## 3. SwiftUI：把界面理解为状态的函数

### 3.1 从命令式 UI 切换到声明式 UI

可以先用这个公式理解 SwiftUI：

```text
当前界面 = View.body(当前输入与状态)
```

UIKit 常见思路是“找到 label，然后 setText”；SwiftUI 常见思路是“修改状态，框架重新计算依赖该状态的视图描述”。

```swift
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        VStack {
            Text("count = \(count)")
            Button("+1") {
                count += 1
            }
        }
    }
}
```

`CounterView` 是短生命周期的值类型描述，不要把它当成长期存在的 `UIViewController` 对象。真正需要跨多次 `body` 求值保存的状态由 SwiftUI 管理，例如 `@State`。

官方依据：[SwiftUI View](https://developer.apple.com/documentation/swiftui/view)、[Declaring a custom view](https://developer.apple.com/documentation/swiftui/declaring-a-custom-view)、[Model data](https://developer.apple.com/documentation/swiftui/model-data)。

### 3.2 `View`、`body`、`some View` 与 result builder

```swift
struct ArticleRow: View {
    let article: Article

    var body: some View {
        HStack {
            Image(systemName: article.isRead ? "checkmark.circle" : "circle")
            Text(article.title)
        }
        .padding(.vertical, 4)
    }
}
```

逐段理解：

- `struct ArticleRow: View`：值类型遵循 `View` 协议。
- `let article`：父视图传入的不可变输入。
- `var body: some View`：计算属性，返回一个底层具体类型固定、对外隐藏类型细节的视图。
- `HStack { ... }`：横向布局容器，闭包由 `ViewBuilder` result builder 处理，所以能连续写多个子视图。
- `.padding(...)`：modifier 返回一个新的视图值，不是就地修改原对象。

重要注意事项：

- `body` 可能被多次求值，应保持快速、确定，避免在里面直接发网络请求、写数据库或创建具有副作用的长期对象。
- modifier 的顺序有时会改变结果，例如“先加背景再 padding”和“先 padding 再加背景”覆盖区域不同。
- `if`、`switch`、有限形式的 `for` 能出现在 builder 中，因为 result builder 把声明式语法转换为组合结果。
- 不要为绕过返回类型问题就到处使用 `AnyView`；先尝试 `@ViewBuilder`、`Group` 或拆分子视图。

官方依据：[View.body](https://developer.apple.com/documentation/swiftui/view/body-8kl5o)、[ViewBuilder](https://developer.apple.com/documentation/swiftui/viewbuilder)、[Result Builders](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/advancedoperators/#Result-Builders)、[Opaque Types](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/opaquetypes/)。

### 3.3 App、Scene 与入口

```swift
@main
struct ArticleApp: App {
    var body: some Scene {
        WindowGroup {
            ArticleListScreen()
        }
    }
}
```

大致层级是：`App` 声明应用入口，`Scene` 描述系统管理生命周期的 UI 场景，`WindowGroup` 提供一个或多个窗口内容，窗口内才是 `View` 树。不要把 `App.body` 和某个页面的 `View.body` 混在一起。

官方依据：[App organization](https://developer.apple.com/documentation/swiftui/app-organization)、[Scene](https://developer.apple.com/documentation/swiftui/scene)、[WindowGroup](https://developer.apple.com/documentation/swiftui/windowgroup)。

### 3.4 状态与数据流：先找“谁拥有真相”

遇到属性包装器时，先问三个问题：

1. 这个值由谁创建和拥有？
2. 子视图只是读取，还是需要反向修改？
3. 是局部 UI 值，还是多个页面共享的引用模型？

#### 现代 Observation 路线（iOS 17+）

| 场景 | 常见写法 | 含义 |
| --- | --- | --- |
| 父视图传入，只读 | `let article: Article` | 普通输入，不由当前视图拥有 |
| 当前视图拥有局部值 | `@State private var isOn = false` | SwiftUI 保存该值并在变化时更新依赖它的 UI |
| 子视图要修改父级值 | `@Binding var isOn: Bool` | 不存储值，只持有到外部 source of truth 的双向连接 |
| 可观察引用模型 | `@Observable final class Store` | 宏在编译期为模型生成 Observation 支持 |
| 当前视图拥有可观察模型 | `@State private var store = Store()` | 保存引用，跟踪 `body` 实际读取的可观察属性 |
| 给可观察模型属性生成 Binding | `@Bindable var store: Store` | 让 `$store.query` 等投影可用于控件双向绑定 |
| 从祖先环境读取系统值 | `@Environment(\.scenePhase)` | 沿视图层级读取环境值 |
| 从祖先环境读取模型 | `@Environment(Store.self)` | 读取祖先通过 `.environment(store)` 注入的 Observable 模型 |

`@State` 与 `@Binding`：

```swift
struct ParentView: View {
    @State private var isEnabled = false

    var body: some View {
        ToggleRow(isEnabled: $isEnabled) // $ 得到 Binding<Bool>
    }
}

struct ToggleRow: View {
    @Binding var isEnabled: Bool

    var body: some View {
        Toggle("启用", isOn: $isEnabled)
    }
}
```

`@Observable`、`@Bindable` 与 `@Environment`：

```swift
import Observation
import SwiftUI

@Observable
@MainActor
final class SearchStore {
    var query = ""
    private(set) var results: [Article] = []
}

struct SearchScreen: View {
    @Environment(SearchStore.self) private var store

    var body: some View {
        @Bindable var store = store

        List(store.results) { article in
            Text(article.title)
        }
        .searchable(text: $store.query)
    }
}
```

祖先必须注入：

```swift
@main
struct SearchApp: App {
    @State private var store = SearchStore()

    var body: some Scene {
        WindowGroup {
            SearchScreen()
                .environment(store)
        }
    }
}
```

如果 `@Environment(SearchStore.self)` 没有在祖先提供非 Optional 对象，运行时会失败。可选读取写成 `@Environment(SearchStore.self) private var store: SearchStore?`，但是否允许缺失应由业务设计决定，不能只是为了隐藏配置错误。

#### 旧项目中的 Combine / ObservableObject 路线

```swift
final class LegacyStore: ObservableObject {
    @Published var query = ""
}

struct OwnerView: View {
    @StateObject private var store = LegacyStore() // 当前视图创建并拥有
    var body: some View { ChildView(store: store) }
}

struct ChildView: View {
    @ObservedObject var store: LegacyStore         // 外部传入并观察
    var body: some View { TextField("搜索", text: $store.query) }
}
```

旧路线还会见到 `.environmentObject(store)` 与 `@EnvironmentObject var store: LegacyStore`。不要在没有统一迁移方案时，把 Observation 与 ObservableObject 包装器随意混搭。

最常见错误：

- 在 `body` 中 `let store = Store()`：每次求值都可能创建新实例，状态身份不稳定。
- 子视图复制一个 `@State` 初始值，以为它会持续跟随父视图；`@State` 是当前视图自己的 source of truth，不是“自动监听所有输入”。
- 该用 `@Binding` 时传普通 `Bool`，导致子视图改不到父级。
- 把所有数据都塞进 environment，依赖关系变得隐式且难测试。
- 后台并发上下文直接修改 UI 模型；界面状态通常应由 main actor 隔离。
- 给列表元素每次计算一个新的随机 `id`，破坏视图身份、动画和状态保持。

官方依据：[Managing model data in your app](https://developer.apple.com/documentation/swiftui/managing-model-data-in-your-app)、[State](https://developer.apple.com/documentation/swiftui/state)、[Binding](https://developer.apple.com/documentation/swiftui/binding)、[Environment](https://developer.apple.com/documentation/swiftui/environment)、[Observable](https://developer.apple.com/documentation/observation/observable)、[Migrating from ObservableObject to Observable](https://developer.apple.com/documentation/swiftui/migrating-from-the-observable-object-protocol-to-the-observable-macro/)。

### 3.5 布局：不是 Auto Layout 约束翻版

最常见容器：

- `VStack`：纵向排列。
- `HStack`：横向排列。
- `ZStack`：沿深度叠放。
- `Spacer`：占用可用空间，把相邻内容推开。
- `ScrollView`：滚动容器。
- `LazyVStack` / `LazyHStack`：按需创建大量滚动内容。
- `Grid` / `LazyVGrid` / `LazyHGrid`：网格布局。
- `List` / `Form`：带平台标准样式和交互的容器。

```swift
VStack(alignment: .leading, spacing: 12) {
    Text("标题")
        .font(.title)

    HStack {
        Text("副标题")
        Spacer()
        Image(systemName: "chevron.right")
    }
}
.padding()
.frame(maxWidth: .infinity, alignment: .leading)
```

可以把 SwiftUI 布局先理解为“父视图提出可用尺寸，子视图选择尺寸，父视图再放置子视图”，而不是给控件一次性设置绝对 frame。注意：

- `.frame(...)` 是在视图外再形成布局行为，不等同于直接改 `UIView.frame`。
- modifier 顺序会影响背景、裁剪、点击区域和尺寸。
- 默认尊重 safe area；只有确实需要内容延伸时才使用 `ignoresSafeArea`。
- 不要一遇到尺寸问题就套 `GeometryReader`；先用 stack、alignment、padding、frame 和 layout priority。
- `LazyVStack` 不是永远更优。Apple 建议先用普通 stack，确认大量子视图确有性能问题后再根据 profiling 选择 lazy 容器。

官方依据：[Layout fundamentals](https://developer.apple.com/documentation/swiftui/layout-fundamentals)、[Picking container views for your content](https://developer.apple.com/documentation/swiftui/picking-container-views-for-your-content)、[Creating performant scrollable stacks](https://developer.apple.com/documentation/swiftui/creating-performant-scrollable-stacks)。

### 3.6 `List`、`ForEach` 与稳定身份

```swift
struct ArticleList: View {
    let articles: [Article]

    var body: some View {
        List(articles) { article in
            ArticleRow(article: article)
        }
    }
}
```

这里要求 `Article: Identifiable`，或者显式告诉 SwiftUI 身份字段：

```swift
List(articles, id: \.id) { article in
    Text(article.title)
}
```

`List` 不只是 `VStack` 加滚动：它带平台适配的行样式、选择、删除、移动等行为，行也按需加载。`ForEach` 是生成重复视图内容的结构，可用于 `List` 内部或其他容器。

身份相关陷阱：

- `id` 应来自稳定业务标识，不要用数组下标代表可能插入、删除或排序的数据。
- 不要把 `var id: UUID { UUID() }` 写成每次读取都生成新值。
- 修改列表时确保更新的是 source of truth，而不是 `body` 中临时计算出的副本。

官方依据：[List](https://developer.apple.com/documentation/swiftui/list)、[Displaying data in lists](https://developer.apple.com/documentation/swiftui/displaying-data-in-lists)、[Identifiable](https://developer.apple.com/documentation/swift/identifiable)。

### 3.7 导航：`NavigationStack` 描述路径与目的地

简单导航：

```swift
NavigationStack {
    List(articles) { article in
        NavigationLink(article.title, value: article)
    }
    .navigationTitle("文章")
    .navigationDestination(for: Article.self) { article in
        ArticleDetail(article: article)
    }
}
```

需要程序化导航时，把 path 作为状态：

```swift
@State private var path: [Article] = []

NavigationStack(path: $path) {
    ArticleList(articles: articles)
        .navigationDestination(for: Article.self) { article in
            ArticleDetail(article: article)
        }
}
```

Java Web 开发者可以把它类比为“UI 内的类型安全路由栈”，但它不是 URL 路由本身。路径中优先保存轻量、稳定、可哈希的导航值或 ID，不要把大型模型对象当作跨页面运输容器。

旧项目可能使用 `NavigationView` 和 destination closure；读代码时要先确认项目最低系统版本与现有导航架构，不要只因看到新 API 就局部混改。

官方依据：[NavigationStack](https://developer.apple.com/documentation/swiftui/navigationstack)、[Understanding the navigation stack](https://developer.apple.com/documentation/swiftui/understanding-the-navigation-stack)。

### 3.8 生命周期、`.task` 与异步加载

```swift
struct ArticleScreen: View {
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ArticleListContent()
            .task {
                await loadArticles()
            }
            .onAppear {
                logPageView()
            }
            .onChange(of: scenePhase) { _, newPhase in
                if newPhase == .background {
                    saveDraft()
                }
            }
    }
}
```

关键区别：

- `.onAppear` / `.onDisappear` 绑定的是某个视图在层级中的出现和消失，不保证整个 app 生命周期只调用一次。
- `.task {}` 适合跟随视图生命周期启动异步工作；视图消失时 SwiftUI 可以自动取消尚未完成的 task。
- `.task(id: value)` 在 `id` 变化时取消旧 task 并启动新 task，适合搜索条件或详情 ID 变化。
- `scenePhase` 有 `.active`、`.inactive`、`.background`，通过 `@Environment` 读取场景状态。
- `body` 被重新求值不等于 `onAppear` 必然执行，但视图身份变化可能造成生命周期重新开始。

因此，不要把“只能执行一次的关键业务操作”仅靠 `onAppear` 偶然保证幂等；应由模型层状态、请求去重或持久化约束保证。

官方依据：[View.task](https://developer.apple.com/documentation/swiftui/view/task(priority:_:))、[View.task(id:)](https://developer.apple.com/documentation/swiftui/view/task(id:priority:_:))、[onAppear](https://developer.apple.com/documentation/swiftui/view/onappear(perform:))、[ScenePhase](https://developer.apple.com/documentation/swiftui/scenephase)。

### 3.9 SwiftUI 与 UIKit 的边界

现实项目常是混合架构：新页面用 SwiftUI，旧页面、复杂控件或第三方 SDK 仍依赖 UIKit。

两个方向：

- UIKit 中展示 SwiftUI：用 `UIHostingController(rootView:)`，它本身是 `UIViewController`。
- SwiftUI 中包装 UIKit：`UIViewRepresentable` 包装 `UIView`，`UIViewControllerRepresentable` 包装 `UIViewController`。

```swift
import SwiftUI
import UIKit

struct ActivityIndicator: UIViewRepresentable {
    let isAnimating: Bool

    func makeUIView(context: Context) -> UIActivityIndicatorView {
        UIActivityIndicatorView(style: .medium)
    }

    func updateUIView(_ uiView: UIActivityIndicatorView, context: Context) {
        if isAnimating {
            uiView.startAnimating()
        } else {
            uiView.stopAnimating()
        }
    }
}
```

阅读 representable 时：

- `makeUIView`：创建 UIKit view，通常不是每次 SwiftUI 状态变化都调用。
- `updateUIView`：把当前 SwiftUI 状态同步到已存在的 UIKit view，必须允许重复调用。
- `Coordinator`：桥接 delegate、data source、target-action 等 UIKit 回调。
- `dismantleUIView`：必要时做清理。

边界陷阱：

- 不要在 `updateUIView` 每次都重复添加 delegate、observer 或 subview。
- 从 UIKit 回调写回 SwiftUI 时，通过 Binding、observable model 或 coordinator 明确数据方向。
- `UIViewRepresentable` 中的 `center`、`bounds`、`frame`、`transform` 布局由 SwiftUI 控制，不要与 SwiftUI 争夺这些属性。
- SwiftUI 视图的值语义不代表被包装的 UIKit 对象也变成值类型。

官方依据：[UIKit integration](https://developer.apple.com/documentation/swiftui/uikit-integration)、[UIHostingController](https://developer.apple.com/documentation/swiftui/uihostingcontroller)、[UIViewRepresentable](https://developer.apple.com/documentation/swiftui/uiviewrepresentable)。

## 4. 一个贯穿示例：异步文章列表

下面的示例以 iOS 17+ 的 Observation 路线展示数据模型、协议、错误、`async/await`、`@MainActor`、environment、List、NavigationStack 和 `.task` 如何连起来。示例数据是本地模拟，不代表真实网络请求结果。

### 4.1 模型与仓库

```swift
import Foundation

struct Article: Identifiable, Hashable {
    let id: Int
    let title: String
    var isRead: Bool
}

enum ArticleRepositoryError: Error {
    case unavailable
}

protocol ArticleRepository {
    func fetchArticles() async throws -> [Article]
}

struct RemoteArticleRepository: ArticleRepository {
    func fetchArticles() async throws -> [Article] {
        try await Task.sleep(for: .milliseconds(300))

        return [
            Article(id: 1, title: "Swift Optional", isRead: false),
            Article(id: 2, title: "SwiftUI State", isRead: true),
        ]
    }
}
```

Java 对照：`Article` 接近 record/DTO，但仍可有可变字段；`ArticleRepository` 接近 interface；`RemoteArticleRepository` 是值类型实现；`async throws` 同时表达异步与可能失败。

### 4.2 可观察 Store

```swift
import Observation

@Observable
@MainActor
final class ArticleStore {
    private let repository: any ArticleRepository

    private(set) var articles: [Article] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    var onlyUnread = false

    init(repository: any ArticleRepository = RemoteArticleRepository()) {
        self.repository = repository
    }

    var visibleArticles: [Article] {
        onlyUnread ? articles.filter { !$0.isRead } : articles
    }

    func load() async {
        guard !isLoading else { return }

        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            articles = try await repository.fetchArticles()
        } catch is CancellationError {
            // 跟随视图生命周期的 task 被取消，不一定需要展示为业务错误。
        } catch {
            errorMessage = "加载失败：\(error.localizedDescription)"
        }
    }
}
```

这里的所有可变 UI 状态由 main actor 隔离。`private(set)` 让 View 可读、只有 Store 自己可写；`defer` 确保正常完成或抛错时都结束 loading。真正项目还要根据产品要求决定取消、重试和错误文案策略。

### 4.3 App 注入、列表与详情页

```swift
import SwiftUI

@main
struct ArticleApp: App {
    @State private var store = ArticleStore()

    var body: some Scene {
        WindowGroup {
            ArticleListScreen()
                .environment(store)
        }
    }
}

struct ArticleListScreen: View {
    @Environment(ArticleStore.self) private var store

    var body: some View {
        @Bindable var store = store

        NavigationStack {
            Group {
                if store.isLoading && store.articles.isEmpty {
                    ProgressView("加载中")
                } else if let errorMessage = store.errorMessage,
                          store.articles.isEmpty {
                    ContentUnavailableView(
                        "加载失败",
                        systemImage: "exclamationmark.triangle",
                        description: Text(errorMessage)
                    )
                } else {
                    List(store.visibleArticles) { article in
                        NavigationLink(value: article) {
                            ArticleRow(article: article)
                        }
                    }
                }
            }
            .navigationTitle("文章")
            .toolbar {
                Toggle("仅未读", isOn: $store.onlyUnread)
            }
            .navigationDestination(for: Article.self) { article in
                ArticleDetailScreen(article: article)
            }
        }
        .task {
            await store.load()
        }
    }
}

struct ArticleRow: View {
    let article: Article

    var body: some View {
        Label(
            article.title,
            systemImage: article.isRead ? "checkmark.circle.fill" : "circle"
        )
    }
}

struct ArticleDetailScreen: View {
    let article: Article

    var body: some View {
        Text(article.title)
            .navigationTitle("详情")
    }
}
```

按数据流阅读这段代码：

1. `ArticleApp` 创建并拥有 `ArticleStore`。
2. `.environment(store)` 把同一个引用模型沿视图树提供下去。
3. `ArticleListScreen` 读取 Store；`@Bindable` 只负责产生 `onlyUnread` 的 Binding。
4. `.task` 调用异步加载；Store 更新 `isLoading`、`articles` 或 `errorMessage`。
5. SwiftUI 追踪 `body` 读取的可观察属性，并重新生成受影响的视图描述。
6. `List` 用稳定的 `Article.id` 区分行，`NavigationLink` 把 `Article` 值放入导航路径。

这条链路对应 Java 后端常见的 Controller → Service → Repository，但 SwiftUI 的 View 不是一个持久化 Controller 对象；它更像“根据当前状态生成 UI 描述的纯函数边界”。

## 5. 用这份手册阅读 `mars` 项目

当前工作区中的 `mars` 是一个 SwiftUI + SwiftData 的环境传感器示例。它规模不大，却覆盖了入口、页面、状态、持久化、协议、服务和测试，很适合作为第一份对照项目。

### 5.1 先看目录分工

| 文件 | 可以先类比成 Java 项目的什么 | 实际职责 |
| --- | --- | --- |
| `mars/marsApp.swift` | `main` 方法 + 应用配置 | App 入口，创建根 View，配置 SwiftData 容器 |
| `mars/ContentView.swift` | 根 Controller / 生命周期协调器 | 读取场景状态，启动或停止采集服务 |
| `mars/Views/HomeView.swift` | 列表 Controller + 页面模板 | 查询设备、展示列表、导航、弹窗和删除操作 |
| `mars/Views/AddDeviceView.swift` | 新增表单页面 | 管理表单局部状态并调用 Repository |
| `mars/Views/DeviceDetailView.swift` | 详情页面 | 展示和操作单台设备 |
| `mars/Models/Device.swift` | JPA Entity + 领域模型 | SwiftData 设备模型、关系和计算属性 |
| `mars/Models/SensorReading.swift` | JPA Entity | SwiftData 传感器读数模型 |
| `mars/Services/DeviceRepository.swift` | Repository / Application Service | 新增、采集、删除、裁剪历史读数并保存 |
| `mars/Services/SensorDataSource.swift` | interface + mock 实现 | 定义读数来源边界并提供模拟实现 |
| `mars/Services/SensorCollectionService.swift` | 定时任务 Service | 使用 `Timer` 周期性采集并写入数据 |
| `marsTests/DeviceRepositoryTests.swift` | JUnit 测试 | 在隔离数据环境中验证 Repository 行为 |

这里的 Java 类比只帮助定位，不代表架构完全相同。SwiftUI 的 View 是值类型界面描述，不是长期存活的 Spring Bean 或 Controller。

### 5.2 从入口顺着数据流读

第一站是 `marsApp.swift`：

```swift
@main
struct MarsApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: [Device.self, SensorReading.self])
    }
}
```

逐行翻译：

- `@main`：进程入口，不需要再找 Java 风格的 `public static void main`。
- `struct MarsApp: App`：定义一个遵循 `App` 协议的值类型。
- `var body: some Scene`：声明应用场景，不是普通页面。
- `WindowGroup { ContentView() }`：窗口的根页面是 `ContentView`。
- `.modelContainer(...)`：创建 SwiftData 持久化容器，并把相关 `ModelContext` 放进后代 View 的 environment。

第二站是 `ContentView.swift`：

```swift
@Environment(\.modelContext) private var modelContext
@Environment(\.scenePhase) private var scenePhase
@State private var collectionService = SensorCollectionService()
```

- 两个 `@Environment` 都是读取上层或系统提供的值，不是在 new Spring Bean。
- `modelContext` 是当前持久化上下文；`scenePhase` 表示 active、inactive 或 background。
- `@State` 让服务实例跟随这个 View 的身份保存。这里服务没有用可观察属性驱动界面，`@State` 主要负责稳定持有它。
- `.onAppear`、`.onChange(of:)` 和 `.onDisappear` 根据场景与页面生命周期调用 `start` / `stop`；这些回调都不应假定全局只执行一次。

第三站是 `HomeView.swift`：

```swift
@Query(sort: \Device.createdAt) private var devices: [Device]
@State private var isShowingAddDevice = false
@State private var errorMessage: String?
```

- `@Query` 由 SwiftData 执行并跟踪查询；数据变化后，依赖 `devices` 的界面会更新。可先类比成“会自动刷新结果的 Repository 查询”，但它属于 View 数据流，不是 Service。
- 两个 `@State` 只属于当前页面：一个控制 sheet，一个保存可能不存在的错误文本。
- `.sheet(isPresented: $isShowingAddDevice)` 中的 `$` 把 `Bool` 状态投影成 `Binding<Bool>`，让 sheet 可以读取并回写展示状态。
- `ForEach(devices)` 能成立，是因为 SwiftData 的 `@Model` 实例有可供 SwiftUI 跟踪的身份。
- `NavigationLink { ... } label: { ... }` 使用了两个尾随闭包：前一个产生目标页面，后一个产生可点击行的内容。

### 5.3 把 SwiftData 暂时对照为 JPA，但不要画等号

`Device.swift` 中的核心声明是：

```swift
@Model
final class Device {
    @Attribute(.unique) var id: UUID
    @Relationship(deleteRule: .cascade, inverse: \SensorReading.device)
    var readings: [SensorReading]
}
```

| SwiftData | 可帮助入门的 JPA 类比 | 需要注意的差异 |
| --- | --- | --- |
| `@Model` | `@Entity` | 是 Swift 宏，不是 Java 运行时注解；会生成持久化与观察所需代码 |
| `@Attribute(.unique)` | 唯一约束 | 具体冲突与保存行为要按 SwiftData 文档和项目策略处理 |
| `@Relationship(... .cascade)` | `@OneToMany(cascade = ...)` | 关系、inverse 和删除规则由 SwiftData 模型共同定义 |
| `ModelContainer` | `EntityManagerFactory` 的粗略类比 | 同时承载 schema 和持久化配置，并能注入 SwiftUI 层级 |
| `ModelContext` | `EntityManager` / persistence context | 负责 fetch、insert、delete、变更跟踪和 save；主界面的环境 context 绑定 main actor |
| `@Query` | 声明式查询结果 | 它是 SwiftUI 属性包装器，会参与页面更新 |
| `FetchDescriptor<T>` | 查询描述对象 | 用于在 View 之外显式 fetch，并不是 JPQL 字符串 |

项目中的保存链路是：

```text
Button / Timer
  -> DeviceRepository
  -> ModelContext.insert/delete/save
  -> SwiftData 持久化与变更通知
  -> @Query 得到新结果
  -> SwiftUI 重新计算受影响的 body
```

因此，页面没有 Java Web 式的“保存后重新发 HTTP 请求”。SwiftData context、查询观察和 SwiftUI 数据流在同一客户端进程中协作。

官方依据：[SwiftData](https://developer.apple.com/documentation/swiftdata)、[Model](https://developer.apple.com/documentation/swiftdata/model())、[ModelContext](https://developer.apple.com/documentation/swiftdata/modelcontext)、[Query](https://developer.apple.com/documentation/swiftdata/query())。

### 5.4 再看协议、存在类型和主 actor

`SensorDataSource.swift` 定义边界：

```swift
protocol SensorDataSource {
    func makeSnapshot(for device: Device) -> SensorSnapshot
}

struct MockSensorDataSource: SensorDataSource { ... }
```

这接近 Java 的 interface + mock 实现，但实现者是值类型 `struct`。`DeviceRepository` 中：

```swift
let dataSource: any SensorDataSource
```

`any SensorDataSource` 表示一个协议存在类型容器，可以在运行时放入不同具体实现。两个初始化器则分别提供默认 mock 和显式依赖注入，类似 Java 的便利构造器与测试构造器。

`DeviceRepository` 和 `SensorCollectionService` 都标记了 `@MainActor`。这不是 `synchronized`，而是说明它们的隔离状态和调用属于 main actor。原因是当前 SwiftData `ModelContext` 与页面数据链路在主 actor 上使用。以后接入真实蓝牙或网络时，应把耗时工作与主 actor 状态提交分开，不能把所有工作直接塞进主 actor。

### 5.5 最后理解 Objective-C 兼容边界

`SensorCollectionService` 继承 `NSObject`，定时器回调写成：

```swift
@objc private func collectTimerDidFire() { ... }
```

这是因为当前 `Timer` 使用 selector 形式调用 Objective-C runtime 可见的方法。它不是一般 Swift 方法都必须继承 `NSObject` 或添加 `@objc`。同时要检查成对生命周期：`start` 创建 timer，`stop` 调用 `invalidate()` 并清空引用，避免定时器继续工作或延长对象寿命。

### 5.6 推荐的第一次实读路线

按下面顺序逐个文件打开，并随手回答右侧问题：

1. `marsApp.swift`：谁是根 View？SwiftData 容器在哪里注入？
2. `ContentView.swift`：哪些值来自 environment？采集何时启动和停止？
3. `HomeView.swift`：哪些是查询结果，哪些是本地 UI 状态？`$` 出现在哪里？
4. `AddDeviceView.swift`：表单如何写入 `@State`？成功后怎样 dismiss？错误怎样变成 alert？
5. `Device.swift` 与 `SensorReading.swift`：哪些是持久化属性、关系、Optional 和计算属性？
6. `DeviceRepository.swift`：一次新增或删除经过哪些步骤？哪个调用会 `throw`？
7. `SensorDataSource.swift`：协议怎样把真实硬件来源与模拟来源隔离？
8. `SensorCollectionService.swift`：timer 的所有权和停止条件是什么？
9. `DeviceRepositoryTests.swift`：测试如何替换数据源、怎样验证保存后的结果？

完成这条路线后，再回头看布局和颜色等 modifier，阅读成本会低很多。

## 6. 阅读其他陌生 iOS 项目的固定顺序

拿到项目后，建议按下面顺序定位：

1. 找 `@main` 与 `App`：确认入口、根 Scene、根 View、environment 注入。
2. 找页面的 `body`：先画出 `NavigationStack`、`List`、stack、sheet 等结构，不急着看 modifier 细节。
3. 标出数据属性：普通 `let/var`、`@State`、`@Binding`、`@Environment`、`@Observable` 或旧 `ObservableObject` 各是谁拥有。
4. 找事件入口：`Button`、`onSubmit`、`onChange`、`.task`、`onAppear`。
5. 沿异步调用向下：View → Store/ViewModel → Repository/Service → `URLSession` 或持久化层。
6. 在每个 `await` 处问：挂起后状态是否可能变化？更新是否仍在正确 actor？取消如何处理？
7. 在每个 closure 处问：是否逃逸？捕获了什么？是否形成强引用环？
8. 在每个列表处问：元素 `id` 是否稳定？修改的是 source of truth 还是副本？
9. 看到 `UIViewRepresentable` / `UIHostingController` 时切换心智模型，明确当前由 SwiftUI 还是 UIKit 管生命周期和布局。
10. 最后再看动画、样式和可访问性 modifier，避免被链式语法淹没。

## 7. Java 开发者高频误区速查

| 误区 | 正确理解 |
| --- | --- |
| `var` 类似 JavaScript 动态变量 | Swift 仍是静态类型，`var` 只表示绑定可变 |
| 所有自定义类型都应该写 `class` | 默认先考虑 `struct`；需要共享身份、继承或特定生命周期时再用 `class` |
| `let array` 像 Java `final List`，仍可 append | Swift 值类型集合绑定为 `let` 后，内容也不能修改 |
| `T?` 只是编译器注解 | 它是真实类型 `Optional<T>`，必须解包 |
| `!` 可以常规解决 Optional 报错 | 它把可恢复问题变成潜在崩溃，应有严格不变量才使用 |
| `Task {}` 等于开后台线程 | Task 是并发工作单元，可能继承当前 actor；不保证后台线程 |
| `await` 之后局部环境完全没变 | task 可挂起，其他工作可能已修改共享或 actor 状态 |
| SwiftUI View 是长期存在的 Controller | View struct 是可反复创建的描述，状态由包装器和模型管理 |
| `body` 只执行一次 | `body` 会按依赖变化反复求值，必须避免副作用和重活 |
| modifier 是修改当前控件 | modifier 通常返回新的组合 View，顺序可能影响结果 |
| `@Environment` 就是 Spring 容器 | 它是视图层级传播机制，依赖缺失可能运行时失败，也会让依赖更隐式 |
| `onAppear` 等于 Activity/Controller 只初始化一次 | 视图可多次出现，回调也可能多次执行 |
| ARC 会像 GC 一样自动处理引用环 | 强引用环不会自动打破，要设计 weak/unowned 或调整所有权 |
| List 用下标或随机 UUID 做 id 就行 | 身份必须稳定并代表同一个业务元素，否则状态和动画会错乱 |

## 8. 官方资料索引

### Swift 语言

- [A Swift Tour](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/guidedtour/)
- [The Basics](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/thebasics/)
- [Functions](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/functions/)
- [Closures](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/closures/)
- [Structures and Classes](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/classesandstructures/)
- [Enumerations](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/enumerations/)
- [Protocols](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/protocols/)
- [Extensions](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/extensions/)
- [Collection Types](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/collectiontypes/)
- [Error Handling](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/errorhandling/)
- [Concurrency](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/concurrency/)
- [Automatic Reference Counting](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/)

### SwiftUI

- [SwiftUI framework](https://developer.apple.com/documentation/swiftui/)
- [Declaring a custom view](https://developer.apple.com/documentation/swiftui/declaring-a-custom-view)
- [Model data](https://developer.apple.com/documentation/swiftui/model-data)
- [Managing model data in your app](https://developer.apple.com/documentation/swiftui/managing-model-data-in-your-app)
- [Layout fundamentals](https://developer.apple.com/documentation/swiftui/layout-fundamentals)
- [NavigationStack](https://developer.apple.com/documentation/swiftui/navigationstack)
- [List](https://developer.apple.com/documentation/swiftui/list)
- [ScenePhase](https://developer.apple.com/documentation/swiftui/scenephase)
- [UIKit integration](https://developer.apple.com/documentation/swiftui/uikit-integration)
