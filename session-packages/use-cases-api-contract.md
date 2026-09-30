# Open-Science Use Cases — 接口契约(mock 阶段)

> 前端已实现完成,后端按此契约提供接口即可。当前由 MSW mock 提供数据,
> mock 数据源文件在 `public/use-cases/`(由 `scripts/import-session-package.ts` 从 `.science` 导出包生成)。

## 数据分层(与 CDN 拆分的约定)

三个页面各自有独立的数据,CDN 存放前就按规则拆好对应的 JSON 和文件路径,
前端只取自己那层,不做任何"从产物列表里猜文件"的逻辑:

| 页面 | 端点 | 数据 |
|---|---|---|
| 列表页 `/open-science/use-cases` | `GET …/use-cases` | 全部案例的索引条目 |
| 详情页 `/open-science/use-cases/:slug` | `GET …/use-cases/:slug` | 详情 metadata:封面图 + 正文 report(md 内容与原文件分开返回) |
| replay 页 `…/:slug/replay` | `GET …/use-cases/:slug/transcript`(进页时拿)和 `…/transcript/full`(点"View full version"按需) | session package detail(完整会话) |

## 接口列表

统一响应信封:`{ "code": 20000, "msg": "Success", "data": ... }`(非 20000 即失败)

| 方法 | 路径 | 说明 | data 类型 |
|---|---|---|---|
| GET | `/api/v1/open-science/use-cases` | 案例列表(列表页) | `UseCaseIndexEntry[]` |
| GET | `/api/v1/open-science/use-cases/:slug` | 详情页 metadata(封面 + 正文 report 单独返回) | `UseCaseDetail` |
| GET | `/api/v1/open-science/use-cases/:slug/transcript` | 精简版对话(replay 页默认) | `UseCaseSession` |
| GET | `/api/v1/open-science/use-cases/:slug/transcript/full` | 完整版(点"View full version"时按需加载) | `UseCaseSession` |

资源文件(图片/PDF/CSV 等)不是接口返回的内容,而是各 JSON 里的 URL 直接引用;
当前指向站内静态文件 `/use-cases/<slug>/objects/…`。

**关于 S3/CDN**:后续接真实后端时,JSON 由接口返回,其中的 URL 字段换成
S3/CDN 绝对地址(或预签名 URL)即可,前端不需要改动。

## 详情页 metadata `UseCaseDetail`

```jsonc
{
  "slug": "glp1-microbiota-bile-acid",
  "title": "基于肠道菌群–胆汁酸代谢轴的GLP-1受体激动剂…",
  "description": "研究GLP-1受体激动剂在减重过程中…",   // 可选
  "exportedAt": 1790140113259,           // 导出时间,毫秒时间戳
  "category": "Metabolism",              // 可选;详情页头部分类 pill(米色底 #e8e2d6)
  "coverImage": "/use-cases/<slug>/figures/figure-01.png", // 可选;hero 封面图,缺失则不渲染图卡
  "figureCount": 7,                      // 会话产出的图片数,头部显示 "7 figures"
  "report": {                            // 可选;数据侧指定的报告,每个字段独立
    "contentUrl": "/use-cases/<slug>/objects/<sha>.md",  // 正文 markdown,渲染为 "What this research found"
    "url": "/use-cases/<slug>/objects/<sha>.pdf",        // "Read the full report" 按钮打开的原文件
    "pageCount": 12                      // 可选;有则头部显示 "12-page report"
  }
}
```

**降级行为**(全部字段可选,前端自动降级,不做猜测):

- `coverImage` 缺失 → 不渲染 hero 图卡
- `report.contentUrl` 缺失 → 正文区块退化为只显示 `description`
- `report.url` 缺失 → 不显示 "Read the full report" 按钮
- `report.pageCount` 缺失 → 头部不显示 "N-page report"

**前端固定文案(不需要数据提供)**:区块标题 "What this research found" /
"How this research was produced",以及后者下方的说明段落(目前为统一模板,见待确认 #7)。

正文 `contentUrl` 与按钮 `url` 是**两个独立字段**:即使内容相同,也由数据侧
分别指定,前端不会把正文渲染和按钮链接互相推导。

**关于 `contentUrl` 与 `url` 同源的情况(待产品确认)**:

- 设计意图:`contentUrl` 是正文渲染用的 markdown,`url` 是按钮打开的原始报告
  文件(预期为 PDF 等独立形态),两者通常不同。
- 但如果某个案例的报告只有 markdown 一种形态,数据侧拆分时两个字段会指向
  **同一个 md 文件**(当前 mock 数据即是如此)——此时按钮打开的原文件和页面
  已渲染的正文内容完全一致,按钮语义上冗余。
- 需要产品确认:生产上"原文件"是否会有独立格式(PDF)?
  - 如果会有 → 无需处理,mock 阶段的同源只是暂时的;
  - 如果永远只有 md → 前端可以在 `url === contentUrl` 时不显示该按钮
    (一行判断),或按设计决定直接去掉按钮。前端暂未做这个降级,等产品结论。

## 列表条目 `UseCaseIndexEntry`

```jsonc
{
  "slug": "glp1-microbiota-bile-acid",   // URL 段:/open-science/use-cases/<slug>
  "title": "基于肠道菌群–胆汁酸代谢轴的GLP-1受体激动剂…",
  "description": "研究GLP-1受体激动剂在减重过程中…",   // 可选
  "exportedAt": 1790140113259,           // 导出时间,毫秒时间戳
  "hasFull": true,                       // 是否有完整版;replay 页据此显示 "View full version" 按钮
  "fullSizeBytes": 53246876,             // 完整层体积估计(按钮文案 + 进度条总量)

  // —— 以下为发布者策展字段(可选,缺失时前端自动降级)——
  "category": "Metabolism",              // 分类标签:仅详情页头部 pill(列表卡片不显示;枚举值待定稿)
  "preview": {                           // 列表页画廊卡片素材
    "image": "/use-cases/<slug>/figures/figure-01.png" // 卡片主图 URL,缺失时卡片显示灰底占位
  }
}
```

**降级行为**:`category` / `preview` 全部可选,缺失时前端自动
降级(不渲染对应元素),不做任何猜测式回退。

契约只包含前端实际消费的字段;前端没有用到的数据不要加进来
(将来需要时再加,加字段比删字段容易)。报告的指定(contentUrl/url/pageCount)
在发布管线完成并写入 detail 接口,列表接口不携带 report 字段。

## 对话内容 `UseCaseSession`(精简版/完整版同一结构)

```jsonc
{
  "schemaVersion": 1,
  "slug": "…",
  "title": "…",
  "description": "…",              // 可选
  "projectName": "122",
  "exportedAt": 1790140113259,
  "sessionCreatedAt": 1790133043410,

  // 时间线:三种条目混排,按时间序
  "items": [
    // 1) 消息
    {
      "type": "message",
      "id": "message-1790133045295-1",
      "role": "user",               // "user" | "assistant"
      "content": "…(markdown 文本)",
      "status": "complete",         // complete | streaming | error
      "createdAt": 1790133045296,
      "completedAt": 1790134532162, // assistant 可选
      "parts": [ { "type": "text", "text": "…" } ],  // user 消息的结构化片段,可选
      "artifacts": [                // 该消息产出的文件(产物画廊),可选
        { "name": "glp1_prediction_prototype.png", "mimeType": "image/png",
          "size": 111392,
          "url": "/use-cases/glp1…/objects/99cf….png",  // 精简版大文件无 url
          "fullOnly": true }                           // fullOnly = 仅完整版可见
      ]
    },

    // 2) 提问卡(Agent 向用户提问,含已答状态)
    {
      "type": "elicitation",
      "id": "ask-user-question-…",
      "message": "您提供了研究主题…",
      "fields": [ { "id": "question_0", "label": "任务类型", "kind": "single-select",
                    "options": [ { "value": "…", "label": "…", "description": "…" } ] } ],
      "status": "completed",
      "createdAt": 1790133078207,
      "state": "answered",          // 可选:answered 时带答案
      "answers": [ { "fieldId": "question_0_custom", "value": "全都要" } ]
    },

    // 3) 工具调用组(折叠卡)
    {
      "type": "activity-group",
      "id": "call_04_…",
      "activities": [ {
        "id": "call_04_…",
        "title": "mcp__skills__load_skill",
        "providerToolName": "mcp__skills__load_skill",  // 前端按此分发渲染器
        "toolKind": "other",        // read | edit | execute | search | think | other…
        "status": "completed",      // pending | in_progress | completed | failed
        "toolDisposition": "declined",  // 可选:被拒绝/关闭
        "createdAt": 1790133157630,
        "updatedAt": 1790133160432,
        "input": { "skill": "mcp-literature" },   // 工具入参(已脱敏)
        "output": […],              // 工具结果(rawOutput)
        "contentBlocks": [ { "type": "content",
                             "content": { "type": "text", "text": "…" } } ],
        "locations": [ { "path": "…", "line": 1 } ],  // Read/Edit 类
        "run": {                    // notebook 执行类工具有:代码 + 输出
          "runId": "…", "status": "completed", "script": "…",
          "outputs": [ { "type": "stream", "name": "stdout", "text": "…" },
                       { "type": "display", "data": { "image/png": "/use-cases/…/figure-01.png" } } ]
        },
        "essentialTruncated": true  // 仅精简版:超长载荷被截断时存在
      } ]
    }
  ],

  // 资源表:storageKey → 可访问 URL;消息/工具里的文件引用都指向这里
  "assets": {
    "artifacts/<proj>/<sess>/…/content": {
      "url": "/use-cases/<slug>/objects/<sha256>.png",
      "filename": "content",
      "sizeBytes": 111392,
      "kind": "file"                // file | notebook | …
    }
  },

  "omissions": [ "Large tool payloads and files over 2 MiB are shortened…" ],
  "excludedFiles": []               // 导出时被用户剔除的文件
}
```

## 精简版 vs 完整版

两者**结构完全相同**,区别只在数据裁剪:

- 精简版:activity 载荷(`input` / `output` / `contentBlocks` / `run`)中的单字符串
  >24KB 截断(带 `essentialTruncated` 标记);消息内容、提问卡字段不截断;
  >2MiB 的文件不提供 `url`(标 `fullOnly`)
- 完整版:全部内容

前端渲染只认这一个结构,不区分来自哪一层。

## 附:mock 数据源

- `public/use-cases/index.json` — 列表接口数据
- `public/use-cases/<slug>/detail.json` — 详情页 metadata 样例
- `public/use-cases/<slug>/essential.json` / `full.json` — 会话双层样例(`random-accessible-link` 最小,几 KB,可直接读)

## 待确认事项(产品/后端对齐)

1. **category 枚举定稿**:当前是临时值(Metabolism / Runtime / Web),部分案例无分类。
2. **头部日期语义**:目前显示 `exportedAt`(导出时间);设计稿上的日期是导出日、会话发生日还是发布日?
3. **report.pageCount 来源**:目前手工策展,真实管线里由谁计算(发布流程 or 后端)?
4. **report.url 是否会有独立格式(PDF)**:决定 `url === contentUrl` 时按钮是否冗余(见上文)。
5. **Related research 选取规则**:目前取 index 顺序中除自身外的前 3 条;是否按同分类优先?
6. **分享行渠道与文案**:当前 7 渠道(X/LinkedIn/Facebook/Reddit/WhatsApp/邮件/复制链接),分享文案用页面标题。
7. **"How this research was produced" 段落**:目前是前端写死的统一模板,唯一动态部分
   是插入 `category`("…ran this {category} investigation end to end — …");两个区块标题
   ("What this research found" / "How this research was produced")也是前端固定文案。
   需要确认:这段话是所有案例统一模板,还是每案例定制?如果定制 → 数据侧在 detail
   里给字段(如 `producedSummary`),前端改为读字段;如果统一模板 → 保持前端固定,
   但文案需与设计稿对齐(当前措辞与设计稿不一致:设计稿为 "gathering the sources,
   carrying out the analysis, … including every intermediate step, is available to view")。
