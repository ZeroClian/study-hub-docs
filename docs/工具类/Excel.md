> 初衷仅是因为网上的Excel工具类不是太老旧的方法，就是不是很满足我想法，就想要自己搞一个，不过还不支持合并单元格等复杂的操作，后续看看能不能优化，有大神有更好的方法，可以公众号联系我，让我学习学习
> ❗️❗️❗️关注：JavaStudys 回复“excel”获取源码

## 整体设计

![excel工具类](http://cdn.liancode.top/img/excel工具类.png)

![](http://cdn.liancode.top/img/20230114083251.png)

## 使用方式

```java
// @Sheet 不是必须的, 如果需要设置字体颜色/背景色, 可以使用该注解
@Sheet(bgColor = "#CBCBCB")
public class Demo {

    @SheetColumn(name = "ID")
    public Integer id;

    @SheetColumn(name = "Name")
    public String name;

    @SheetColumn(name = "Description", width = 30) // 宽度接近英文字符数
    public String description;

    // 默认为: yyyy-MM-dd, 根据实际情况设置
    @SheetColumn(name = "Created At", dateFormat = "yyyy-MM-dd HH:mm:ss")
    public LocalDateTime createdAt;

}
//读群数据
ExcelReader<Demo> reader=Excel.createReader(Demo::new);
reader.setEvaluateFormula(true); // 如果需要计算公式, 请设置为 true
List<Demo> list=reader.read(inputStream);
//写入数据
ExcelWriter<Demo> writer=Excel.createWriter(Demo.class);
Demo demo=new Demo();
demo.name="哈哈";
demo.createdAt=LocalDateTime.now();
...
    writer.write(demo);// 也可以是 List
writer.save(new FileOutputStream("D:/a.xlsx"));
```

## 需要依赖

```xml
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi</artifactId>
    <version>5.2.3</version>
</dependency>
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-ooxml</artifactId>
    <version>5.2.3</version>
</dependency>
<dependency>
    <groupId>org.apache.poi</groupId>
    <artifactId>poi-scratchpad</artifactId>
    <version>5.2.3</version>
</dependency>
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-lang3</artifactId>
</dependency>
```

## 代码实现

1. 首先Excel类只定义了读写创建器和部分跟读写关系不大的方法，具体的实现由读写类内部实现，使用起来比较清晰

   ```java
   /**
    * @author ZeroClian
    * @date 2023-01-10 15:35
    */
   public class Excel {
       private static final Logger logger = LoggerFactory.getLogger(Excel.class);
   
       public static ExcelReader<T> createReader(Supplier<T> supplier) {
           return new ExcelReader<>(supplier);
       }
   
       public static ExcelWriter<T> createWriter(Class<T> clazz) {
           return new ExcelWriter<>(clazz);
       }
   
   
       public static Object getCellValue(Cell cell, FormulaEvaluator formulaEvaluator) {
           switch (cell.getCellType()) {
               case ERROR:
                   return ErrorEval.getText(cell.getErrorCellValue());
               case BLANK:
                   return "";
               case BOOLEAN:
                   return cell.getBooleanCellValue();
               case FORMULA:
                   if (formulaEvaluator == null) {
                       return cell.getCellFormula();
                   } else {
                       CellValue cellValue = formulaEvaluator.evaluate(cell);
                       if (cellValue.getCellType() == CellType.NUMERIC) {
                           return cellValue.getNumberValue();
                       }
                       if (cellValue.getCellType() == CellType.STRING) {
                           return cellValue.getStringValue();
                       }
                       if (cellValue.getCellType() == CellType.BOOLEAN) {
                           return cellValue.getBooleanValue();
                       }
                       return cellValue.toString();
                   }
               case NUMERIC:
                   if (DateUtil.isCellDateFormatted(cell)) {
                       return cell.getDateCellValue();
                   }
                   return cell.getNumericCellValue();
               case STRING:
                   return cell.getRichStringCellValue().toString();
               default:
                   logger.error("Unknown Cell Type: {}", cell.getCellType());
                   return null;
           }
       }
   
       /**
        * 26进制转换为十进制, 然后减去一(列索引基于0)
        *
        * @param name
        * @return
        */
       public static int toColumnIndex(String name) {
           int n = 0;
           for (int i = name.length() - 1, j = 1; i >= 0; i--, j *= 26) {
               char c = name.charAt(i);
               if (c < 'A' || c > 'Z') return 0;
               n += ((int) c - 64) * j;
           }
           return n - 1;//index要减一
       }
   
       /**
        * @param nm 例如: #FFCCEE
        * @return
        */
       static XSSFColor createColor(String nm) {
           java.awt.Color color = java.awt.Color.decode(nm);
           byte r = (byte) color.getRed();
           byte g = (byte) color.getGreen();
           byte b = (byte) color.getBlue();
           return new XSSFColor(new byte[]{r, g, b});
       }
   
   }
   ```

2. 读excel核心就是如何将获取的值与Field字段对应，这里采用的自定义注解的方式，通过excel文件的列名与注解的列名对应即可，之后就是将cell值转换为对应的对象，再为field赋值，注意如果是private修饰的，需要添加``field.setAccessible(true)``

   ```java
   /**
    * @author ZeroClian
    * @date 2023-01-10 15:35
    */
   public class ExcelReader<T> {
   
       private static final Logger logger = LoggerFactory.getLogger(Excel.class);
       private static final DefaultConversionService convert = new DefaultConversionService();
   
       private final Supplier<T> supplier;
       private boolean evaluateFormula = false;
       private FormulaEvaluator formulaEvaluator = null;
   
       public ExcelReader(Supplier<T> supplier) {
           this.supplier = supplier;
       }
   
       /**
        * 设置自动计算公式
        *
        * @param evaluateFormula true表示执行计算
        */
       public void setEvaluateFormula(boolean evaluateFormula) {
           this.evaluateFormula = evaluateFormula;
       }
   
       /**
        * 读取Excel
        *
        * @param in 输入流
        * @return {@link List<T> objects} 对象列表
        * @throws IOException
        */
       public List<T> read(InputStream in) throws IOException {
           Workbook workbook = WorkbookFactory.create(in);
           if (evaluateFormula) {
               this.formulaEvaluator = workbook.getCreationHelper().createFormulaEvaluator();
           }
           //读取数据
           List<T> list = new ArrayList<>();
           for (Sheet sheet : workbook) {
               List<String> headers = getSheetHeaders(sheet);
               Iterator<Row> rowIterator = sheet.rowIterator();
               while (rowIterator.hasNext()) {
                   Row row = rowIterator.next();
                   if (row.getRowNum() == 0) {
                       continue;
                   }
                   T obj = rowToObject(headers, row, supplier);
                   if (null != obj) {
                       list.add(obj);
                   }
               }
           }
           return list;
       }
   
       /**
        * 获取列名（位于第一行）
        *
        * @param sheet 页
        * @return {@link List<String> headers} 列名列表
        */
       public List<String> getSheetHeaders(Sheet sheet) {
           Row row = sheet.getRow(0);
           List<String> headers = new ArrayList<>();
           for (Cell cell : row) {
               String cellValue = cell.getStringCellValue();
               headers.add(cellValue);
           }
           return headers;
       }
   
       /**
        * 单行转为对象
        *
        * @param headers  列名
        * @param row      行
        * @param supplier 要转换的对象
        * @return {@link Object}
        */
       private T rowToObject(List<String> headers, Row row, Supplier<T> supplier) {
           try {
               T obj = supplier.get();
               //获取字段
               Field[] fields = obj.getClass().getDeclaredFields();
               boolean isEmpty = true;
               for (Field field : fields) {
                   SheetColumn ec = field.getAnnotation(SheetColumn.class);
                   if (null == ec) continue;
                   int columnIndex = headers.indexOf(ec.name());
                   if (columnIndex >= 0) {
                       Cell cell = row.getCell(columnIndex);
                       if (null != cell) {
                           isEmpty = setValue(obj, field, cell, ec.dateFormat());
                       }
                   }
               }
               return isEmpty ? null : obj;
           } catch (Exception e) {
               throw new RuntimeException(e);
           }
       }
   
       /**
        * 向对象设置值
        *
        * @param obj        对象
        * @param field      字段
        * @param cell       单元格
        * @param dateFormat 日期格式
        */
       private boolean setValue(T obj, Field field, Cell cell, String dateFormat) throws IllegalAccessException, ParseException {
           Object value = Excel.getCellValue(cell, formulaEvaluator);
           if (null == value) return true;
           boolean emptyValue = ObjectUtils.isEmpty(value);
           Class<?> valueClass = value.getClass();
           Class<?> fieldClass = field.getType();
           field.setAccessible(true);
           if (fieldClass == valueClass) {
               field.set(obj, value);
               return false;
           }
           //java8 日期、时间
           if (Temporal.class.isAssignableFrom(fieldClass)) {
               if (emptyValue) {
                   return true;
               }
               String cellStr = value.toString();
               DateTimeFormatter formatter = DateTimeFormatter.ofPattern(dateFormat);
               if (LocalDateTime.class.isAssignableFrom(fieldClass)) {
                   field.set(obj, LocalDateTime.parse(cellStr, formatter));
               }
               if (LocalDate.class.isAssignableFrom(fieldClass)) {
                   field.set(obj, LocalDate.parse(cellStr, formatter));
               }
               if (OffsetDateTime.class.isAssignableFrom(fieldClass)) {
                   field.set(obj, OffsetDateTime.parse(cellStr, formatter));
               }
           }
           //java.util.Date
           if (Date.class.isAssignableFrom(fieldClass)) {
               if (emptyValue) {
                   return true;
               }
               String cellStr = value.toString();
               SimpleDateFormat format = new SimpleDateFormat(dateFormat);
               Date date = format.parse(cellStr);
               field.set(obj, date);
               return false;
           }
           if (convert.canConvert(valueClass, fieldClass)) {
               Object newValue = ExcelReader.convert.convert(value, fieldClass);
               if (null != newValue) {
                   field.set(obj, newValue);
               }
               return false;
           }
           throw new IllegalArgumentException("表数据类型与类字段类型不一致: " + value.getClass() + " -> " + field.getType());
       }
   }
   ```

3. 导出则比较简单，只是将对象转换为对应列的值，跟其他人的区别是，增加了表头的注解，用于简单设置导出的颜色背景样式，

   ```java
   /**
    * @author ZeroClian
    */
   public class ExcelWriter<T> implements AutoCloseable {
   
       private static final Logger logger = LoggerFactory.getLogger(Excel.class);
   
       private final Class<T> clazz;
       private final SXSSFWorkbook workbook;
       private SXSSFSheet sheet;
       private Map<Field, Header> fieldHeaderMap;
   
       public ExcelWriter(Class<T> clazz) {
           this.clazz = clazz;
           this.workbook = new SXSSFWorkbook(300);
           this.init();
           this.createSheet();
       }
   
       /**
        * 获取字段对应的列
        */
       public void init() {
           Map<Field, Header> map = new LinkedHashMap<>();
           Set<Integer> usedIndex = new HashSet<>();
           Queue<Integer> queue = new LinkedList<>();
           for (Field field : clazz.getDeclaredFields()) {
               SheetColumn ec = field.getAnnotation(SheetColumn.class);
               if (null == ec) continue;
               int columnIndex = -1;
               if (!ec.column().isEmpty()) {
                   columnIndex = Excel.toColumnIndex(ec.column());
                   if (!usedIndex.add(columnIndex)) {
                       logger.warn("重复列编号: {}", ec.column());
                   }
               }
               Header header = new Header(ec.name(), ec.column(), columnIndex, ec.dateFormat(), ec.width());
               map.put(field, header);
               queue.add(queue.size());
           }
           queue.removeAll(usedIndex);
           map.forEach((field, header) -> {
               if (header.getColumnIndex() < 0) {
                   header.setColumnIndex(queue.remove());
               }
           });
           this.fieldHeaderMap = map;
       }
   
       /**
        * 创建Sheet和表头
        */
       public void createSheet() {
           String name = "Sheet1";
           String color = "#000000";
           String bgColor = "#CBCBCB";
           Sheet sheetInfo = clazz.getAnnotation(Sheet.class);
           if (null != sheetInfo) {
               if (!sheetInfo.name().isBlank()) {
                   name = sheetInfo.name();
               }
               color = sheetInfo.color();
               bgColor = sheetInfo.bgColor();
           }
           this.sheet = workbook.createSheet(name);
           //表头
           Row headerRow = sheet.createRow(0);
           CellStyle cellStyle = workbook.createCellStyle();
           cellStyle.setFillForegroundColor(Excel.createColor(bgColor));
           cellStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
           cellStyle.setAlignment(HorizontalAlignment.CENTER);
           XSSFFont font = (XSSFFont) workbook.createFont();
           font.setColor(Excel.createColor(color));
           font.setBold(true);
           cellStyle.setFont(font);
           sheet.trackAllColumnsForAutoSizing();
           fieldHeaderMap.forEach((field, header) -> {
               if (header.getColumnWidth() > 0) {
                   int width = Math.min(16_384, header.getColumnWidth() * 256);
                   sheet.setColumnWidth(header.getColumnIndex(), width);
               } else if (header.getColumnWidth() == 0) {
                   sheet.setColumnHidden(header.getColumnIndex(), true);
               } else {
                   sheet.autoSizeColumn(header.getColumnIndex());
               }
           });
           fieldHeaderMap.forEach((field, header) -> {
               Cell cell = headerRow.createCell(header.getColumnIndex());
               cell.setCellStyle(cellStyle);
               cell.setCellValue(header.getName());
           });
       }
   
       /**
        * 写入单个对象
        *
        * @param obj 对象
        * @throws IOException
        */
       public void write(T obj) throws IOException {
           try {
               if (null == obj) {
                   return;
               }
               Row row = sheet.createRow(sheet.getLastRowNum() + 1);
               for (Map.Entry<Field, Header> entry : fieldHeaderMap.entrySet()) {
                   Cell cell = row.createCell(entry.getValue().getColumnIndex());
                   Field field = entry.getKey();
                   Header header = fieldHeaderMap.get(field);
                   Object cellValue = field.get(obj);
                   String value;
                   if (cellValue instanceof Date date) {
                       value = DateFormatUtils.format(date, header.getDateFormat());
                   } else if (cellValue instanceof Temporal temporal) {
                       value = DateTimeFormatter.ofPattern(header.getDateFormat()).format(temporal);
                   } else {
                       value = Objects.toString(cellValue, "");
                   }
                   cell.setCellValue(value);
               }
           } catch (IllegalAccessException e) {
               throw new RuntimeException(e);
           }
       }
   
       public void write(List<T> list) throws IOException {
           for (T obj : list) {
               write(obj);
           }
       }
   
       public void save(OutputStream out) throws Exception {
           workbook.write(out);
           close();
       }
   
       @Override
       public void close() throws Exception {
           this.workbook.close();
       }
   
   }
   ```

4. 剩余就是注解的定义，这里我只定义了常用的，可自行修改

   ```java
   /**
    * Excel表整体格式配置（非必选）
    * 主要用于设置表格格式
    * 修改：字体颜色，背景颜色
    *
    * @author ZeroClian
    * @date 2023-01-06 20:08
    */
   @Target(ElementType.TYPE)
   @Retention(RetentionPolicy.RUNTIME)
   @Documented
   public @interface Sheet {
   
       /**
        * 表名
        */
       String name() default "";
   
       /**
        * 字体颜色
        */
       String color() default "#000000";
   
       /**
        * 背景颜色
        */
       String bgColor() default "#CBCBCB";
   }
   
   /**
    * 列注解
    *
    * @author ZeroClian
    * @date 2023-01-06 20:20
    */
   @Target(ElementType.FIELD)
   @Retention(RetentionPolicy.RUNTIME)
   @Documented
   public @interface SheetColumn {
   
       String name() default "";
   
       String column() default "";
   
       int width() default 16;
   
       String dateFormat() default "yyyy-MM-dd";
   }
   
   /**
    * @author Justin
    */
   @Data
   public class Header {
   
       private String name;
       private String column;
       private int columnIndex;
       private String dateFormat;
       private int columnWidth;
       private XSSFColor color;
       private XSSFColor bgColor;
   
       public Header(String name, String column, int columnIndex, String dateFormat, int columnWidth) {
           this.name = name;
           this.column = column;
           this.columnIndex = columnIndex;
           this.dateFormat = dateFormat;
           this.columnWidth = columnWidth;
       }
   }
   ```

   

