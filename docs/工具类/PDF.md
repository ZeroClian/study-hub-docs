

## 概览

![](https://raw.githubusercontent.com/ZeroClian/picture/master/img/20230617122956.png)

文末关注公众号，发送关键字“pdf”获取源码
![](https://raw.githubusercontent.com/ZeroClian/picture/master/img/20230617152652.png)

需要依赖
```
<dependency>
    <groupId>org.jodconverter</groupId>
    <artifactId>jodconverter-local</artifactId>
    <version>4.4.6</version>
</dependency>
<dependency>
    <groupId>org.apache.pdfbox</groupId>
    <artifactId>pdfbox</artifactId>
    <version>2.0.28</version>
</dependency>
```

## 核心实现

### 文件转换

文件转换的核心分为两步：
- 启动officeManager的`LocalConverter`
- 使用LocalConverter的`converter()`进行文件转换

```
    private LocalConverter newLocalConverter() throws OfficeException {
        if (StringUtils.isBlank(officeHome)) {
            File defHome = LocalOfficeUtils.getDefaultOfficeHome();
            if (defHome.exists() && defHome.isDirectory()) {
                officeHome = defHome.toString();
            }
        }
        if (StringUtils.isBlank(officeHome)) {
            logger.error("未指定 LibraryOffice 安装目录 (office.home)");
            return null;
        }
        LocalOfficeManager officeManager = LocalOfficeManager.builder()
                .maxTasksPerProcess(3)
                .existingProcessAction(ExistingProcessAction.KILL)
                .processTimeout(120_000L)
                .taskExecutionTimeout(30_000L)
                .taskQueueTimeout(30_000L)
                .officeHome(officeHome)
                .build();
        officeManager.start();
        SpringApplication.getShutdownHandlers().add(() -> {
            if (officeManager.isRunning()) {
                try {
                    officeManager.stop();
                } catch (Throwable e) {
                    //ignore
                }
            }
        });
        return LocalConverter.builder().officeManager(officeManager).build();
    }
```

通过 `LocalOfficeUtils.getDefaultOfficeHome()` 可以获取到安装好的Libreoffice的路径，使用 `LocalOfficeManager.builder()` 构建 LocalOfficeManager 并启动，`SpringApplication.getShutdownHandlers().add()` 注册一个钩子，在程序关闭的时候结束掉 officeManager 。

```
    private void covert(InputStream source, OutputStream target, FileType formType, FileType toType, WaterMark waterMark) throws FileConversionException {
        DocumentFormat srcType = DefaultDocumentFormatRegistry.getFormatByExtension(formType.name());
        DocumentFormat trgType = DefaultDocumentFormatRegistry.getFormatByExtension(toType.name());
        if (srcType == null || trgType == null) {
            throw new FileConversionException("不支持该文件格式转换: " + formType + "-->" + toType);
        }
        try {
            if (waterMark != null) {
                File tempFile = File.createTempFile("convert-", ".pdf");
                logger.info("生成临时文件:{}", tempFile);
                converter.convert(source).as(srcType).to(tempFile).as(trgType).execute();
                waterMark.add(new FileInputStream(tempFile), target);
                if (!tempFile.delete()) logger.error("临时文件删除失败:{}", tempFile);
            } else {
                converter.convert(source).as(srcType).to(target).as(trgType).execute();
            }
        } catch (OfficeException | IOException e) {
            throw new FileConversionException(e.getMessage(), e.getCause());
        }
    }
```
使用 `LocalConverter.builder().officeManager(officeManager).build()`返回的 `converter` 进行转换，对于需要加水印的pdf，传入实现WaterMark接口的实现类可以自定义水印。

以文本水印为列：

```
    @Override
    public void add(InputStream in, OutputStream out) throws IOException {
        // 加载PDF文件fontSize
        PDDocument document = PDDocument.load(in);
        document.setAllSecurityToBeRemoved(true);
        // 遍历PDF文件，在每一页加上水印
        for (PDPage page : document.getPages()) {
            PDPageContentStream stream = new PDPageContentStream(document, page, PDPageContentStream.AppendMode.APPEND, true, true);
            // 加载水印字体
            PDFont font = PDType1Font.COURIER_BOLD;
            PDExtendedGraphicsState r = new PDExtendedGraphicsState();
            // 设置透明度
            r.setNonStrokingAlphaConstant(0.2f);
            r.setAlphaSourceFlag(true);
            stream.setGraphicsStateParameters(r);
            // 设置水印字体颜色
            stream.setFont(font, 12);
            stream.setNonStrokingColor(0, 200, 0);
            stream.beginText();
            stream.newLineAtOffset(0, -15);
            // 获取PDF页面大小
            float pageHeight = page.getMediaBox().getHeight();
            float pageWidth = page.getMediaBox().getWidth();
            // 根据纸张大小添加水印，30度倾斜
            for (int h = 10; h < pageHeight; h = h + rowSpace) {
                for (int w = -10; w < pageWidth; w = w + colSpace) {
                    stream.setTextMatrix(Matrix.getRotateInstance(0.3, w, h));
                    stream.showText(waterMark);
                }
            }
            // 结束渲染，关闭流
            stream.endText();
            stream.restoreGraphicsState();
            stream.close();
        }
        document.save(out);
        document.close();
        in.close();
    }
```

实现 WaterMark 的 `add()` 完成自定义，`PDDocument.load()` 和 `document.save()`既可以传File，也可以传 InputStream，根据需求改造即可。

### 其他工具类定义
- 用于下载转换后的文件时设置response的参数

```
/**
 * @author Justin
 */
public class HttpUtil {

    public static void responseSetting(String fileName, String extension, HttpServletResponse response) {
        String baseName = FilenameUtils.getBaseName(fileName).replace(" ", "");
        if (StringUtils.isBlank(extension)) extension = FilenameUtils.getExtension(fileName);
        String fileNameURL = URLEncoder.encode(baseName + "." + extension, StandardCharsets.UTF_8);
        //设置响应类型:传输内容是流，并支持中文
        response.setContentType("application/octet-stream;charset=UTF-8");
        //设置响应头信息header，下载时以文件附件下载
        response.setHeader("Content-disposition", "attachment;filename=" + fileNameURL + ";" + "filename*=utf-8''" + fileNameURL);
    }
}
```




使用示例：

```
    @PostMapping("/convert_new")
    public void covert_new(@RequestParam("file") MultipartFile file, HttpServletResponse response) {
        try {
            InputStream is = file.getInputStream();
            HttpUtil.responseSetting(file.getOriginalFilename(), "pdf", response);
            fileConvertService.word2Pdf(is, response.getOutputStream(), TextWaterMark.Builder().waterMark("Justin"));
        } catch (IOException | FileConversionException e) {
            e.printStackTrace();
        }

    }
```

![](https://raw.githubusercontent.com/ZeroClian/picture/master/img/20230617145943.png)

![](https://raw.githubusercontent.com/ZeroClian/picture/master/img/20230617150119.png)

## 可能出现错误

The field file exceeds its maximum permitted size of 1048576 bytes

原因：springboot内置的tomcat默认上传文件大小为1mb，需要修改配置文件`application.yml`，添加：

```
spring:
  servlet:
    multipart:
      max-file-size: 50MB
      max-request-size: 50MB
```