import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { remarkYoutubeThumbnails } from '../../lib/remark-youtube-thumbnails'

const renderArticle = (content: string, videoIds = ['ijpmwTPK8pU']) =>
  renderToStaticMarkup(
    <ReactMarkdown remarkPlugins={[remarkGfm, [remarkYoutubeThumbnails, { videoIds }]]}>
      {content}
    </ReactMarkdown>
  )

describe('YouTube article thumbnails', () => {
  test('preserves empty table cells and list structure', () => {
    const html = renderArticle(`| Result | Notes |
| --- | --- |
| 42 | |

-
- Kept`)
    expect(html).toContain('<td></td>')
    expect(html).toContain('<li></li>')
    expect(html).toContain('<li>Kept</li>')
  })

  test('removes video-linked covers while keeping ordinary screenshots, links and copy', () => {
    const html = renderArticle(`![Article cover](https://example.test/cover.png)

[![Video preview](https://example.test/video-cover.png)](https://www.youtube.com/watch?v=ijpmwTPK8pU)

![Analysis screenshot](https://example.test/analysis.png)

[![Linked screenshot](https://example.test/linked.png)](https://example.test/report)

[Watch on YouTube](https://youtu.be/ijpmwTPK8pU)

## Results

The original findings remain.`)
    expect(html).not.toContain('video-cover.png')
    expect(html).not.toContain('Video preview')
    for (const text of [
      'Article cover',
      'Analysis screenshot',
      'Linked screenshot',
      'Watch on YouTube',
      'The original findings remain.'
    ]) {
      expect(html).toContain(text)
    }
    expect(html).not.toContain('<p></p>')
  })

  test('handles reference-style thumbnails and preserves text beside an image', () => {
    const html = renderArticle(`[![Reference preview][image]][VIDEO]

[**![Nested preview](https://example.test/nested.png)** Watch the workflow](https://youtu.be/ijpmwTPK8pU)

[image]: https://example.test/preview.png
[video]: https://youtube.com/watch?v=ijpmwTPK8pU`)
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<p></p>')
    expect(html).toContain('Watch the workflow')
    expect(html).toContain('href="https://youtu.be/ijpmwTPK8pU"')
  })

  test('retains covers unless their video has been embedded, including lookalike hosts', () => {
    const content =
      '[![Video preview](https://example.test/video.png)](https://youtube.com/watch?v=ijpmwTPK8pU)'
    expect(renderArticle(content, [])).toContain('alt="Video preview"')
    expect(renderArticle(content, ['M7lc1UVf-VE'])).toContain('alt="Video preview"')
    expect(renderArticle(content.replace('youtube.com', 'notyoutube.com'))).toContain(
      'alt="Video preview"'
    )
  })
})
