import { HttpResponse, http } from 'msw'
import { homepageOpenScienceConfigFixture } from '../../tests/e2e/homepage-e2e-fixtures'
import { blogs, commentFor, fixtureDate, mockManifest, posts, skills } from '../fixtures'
import { json, matches, missing, paginate, query, withRequest } from './shared'

export const contentHandlers = (origin: string) => [
  http.get(`${origin}/api/v1/homepage/:module/read-watch`, ({ params }) =>
    ['openscience', 'medflow', 'skills'].includes(String(params.module))
      ? json({
          items: blogs.slice(0, 2).map((blog) => ({
            title: blog.title,
            category: blog.category.name,
            published_at: blog.published_at,
            slug: blog.slug
          }))
        })
      : missing()
  ),
  http.get(`${origin}/api/v1/homepage/:module`, ({ params }) =>
    ['openscience', 'medflow', 'skills'].includes(String(params.module))
      ? json({
          ...homepageOpenScienceConfigFixture,
          release_version: 'v1.0.0-mock',
          latest_release_update: 'Sep 1, 2026',
          latest_release_title: 'Local mock release',
          latest_release_desc: 'Sample release data for local development.',
          media: []
        })
      : missing()
  ),
  http.get(
    `${origin}/api/v1/blog/posts`,
    withRequest(({ request }) => json(paginate(blogs, query(request))))
  ),
  http.get(
    `${origin}/api/v1/blog/sitemap`,
    withRequest(({ request }) => {
      const base = (query(request).get('base_url') || `${origin}/blog`).replace(/\/$/, '')
      return json(
        blogs.map((blog) => ({
          url: `${base}/${blog.slug}`,
          last_modified: fixtureDate,
          change_frequency: 'weekly'
        }))
      )
    })
  ),
  http.get(
    `${origin}/api/v1/blog/posts/:slug`,
    withRequest(({ params }) => {
      const blog = blogs.find((item) => item.slug === params.slug)
      return blog ? json(blog) : missing()
    })
  ),
  http.get(
    `${origin}/api/v1/posts`,
    withRequest(({ request }) => {
      const params = query(request)
      const filtered = posts.filter((post) =>
        matches(`${post.title} ${post.content}`, params.get('search'))
      )
      if (params.get('sort') === 'new')
        filtered.sort((a, b) => b.created_at.localeCompare(a.created_at))
      else if (params.get('sort') === 'shuffle')
        filtered.sort((a, b) => ((a.id * 17) % 29) - ((b.id * 17) % 29))
      else filtered.sort((a, b) => b.score - a.score)
      return json(paginate(filtered, params))
    })
  ),
  http.get(
    `${origin}/api/v1/posts/:id/comments`,
    withRequest(({ request, params }) => {
      const post = posts.find((item) => item.id === Number(params.id))
      return post ? json(paginate([commentFor(post.id)], query(request))) : missing()
    })
  ),
  http.get(
    `${origin}/api/v1/posts/:id`,
    withRequest(({ params }) => {
      const post = posts.find((item) => item.id === Number(params.id))
      return post ? json(post) : missing()
    })
  ),
  // External JSON dependencies use the same interception path as business data.
  http.get('https://statics.aipoch.com/open-science/app/stable/version.json', () =>
    HttpResponse.json(mockManifest(origin))
  ),
  http.get('https://api.github.com/repos/aipoch/open-science', () =>
    HttpResponse.json({ stargazers_count: 1234 })
  ),
  http.get(`${origin}/sitemap`, () =>
    HttpResponse.xml('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>')
  )
]

// Navigational downloads need an actual HTTP response even without an active browser worker.
export const downloadHandlers = (origin: string) => [
  http.get(`${origin}/skill-downloads/:file`, ({ params }) => {
    const skill = skills.find((item) => `${item.path}.md` === params.file)
    return skill
      ? HttpResponse.text(skill.skill_md, {
          headers: {
            'Content-Type': 'text/markdown',
            'Content-Disposition': `attachment; filename="${skill.path}.md"`
          }
        })
      : missing()
  }),
  http.get(`${origin}/downloads/:file`, ({ params }) => {
    const file = String(params.file)
    if (!/^(mac-x64|mac-arm64|win-x64|linux-x64-appimage|linux-x64-deb)\.txt$/.test(file))
      return missing()
    return HttpResponse.text('Local mock download. This is not an application installer.\n', {
      headers: { 'Content-Disposition': `attachment; filename="mock-${file}"` }
    })
  })
]
