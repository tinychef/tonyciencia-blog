import fs from 'node:fs';
import path from 'node:path';

const SEED_FILE = path.join(process.cwd(), 'seed', 'seed.json');
const WP_API_URL = 'https://tonyciencia.com/wp-json/wp/v2/posts?per_page=10';

function stripHtml(html) {
  return html.replace(/<[^>]*>?/gm, '').trim();
}

function htmlToPortableText(html) {
  // Very basic HTML to Portable Text converter
  const blocks = [];
  
  // Split by common block elements
  const segments = html.split(/<\/?(?:p|h2|h3|h4|div|ul|ol|li)[^>]*>/);
  
  for (const seg of segments) {
    const text = stripHtml(seg);
    if (!text || text.length === 0) continue;
    
    // Default to normal style
    let style = 'normal';
    
    // Try to infer headers based on length or just make it normal for simplicity
    if (text.length < 100 && text.endsWith('?')) {
        style = 'h2';
    }

    blocks.push({
      _type: 'block',
      style: style,
      children: [{ _type: 'span', text: text }]
    });
  }
  
  // If parsing failed or was empty, add a fallback
  if (blocks.length === 0) {
      blocks.push({
          _type: 'block',
          style: 'normal',
          children: [{ _type: 'span', text: stripHtml(html) }]
      });
  }
  
  return blocks;
}

async function importBlogs() {
  console.log('Fetching latest posts from TonyCiencia.com...');
  
  try {
    const response = await fetch(WP_API_URL);
    const wpPosts = await response.json();
    
    console.log(`Found ${wpPosts.length} posts. Reading seed.json...`);
    
    const seedData = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
    
    if (!seedData.content) seedData.content = {};
    if (!seedData.content.posts) seedData.content.posts = [];
    
    let addedCount = 0;
    
    for (const wpPost of wpPosts) {
      const title = stripHtml(wpPost.title.rendered);
      const slug = wpPost.slug;
      
      // Check if post already exists
      if (seedData.content.posts.some(p => p.slug === slug)) {
        console.log(`Skipping ${slug} (already exists)`);
        continue;
      }
      
      // Infer locale (basic heuristic: if title has "The" or "How to", it's English)
      const isEnglish = /\b(the|how to|in|and|of)\b/i.test(title);
      const locale = isEnglish ? 'en' : 'es';
      
      const newPost = {
        id: `wp-${wpPost.id}`,
        slug: slug,
        status: 'published',
        data: {
          title: title,
          excerpt: stripHtml(wpPost.excerpt.rendered).substring(0, 160) + '...',
          locale: locale,
          source: 'manual',
          publishedAt: wpPost.date,
          content: htmlToPortableText(wpPost.content.rendered)
        },
        bylines: [{ byline: "byline-tony" }],
        taxonomies: {
          category: ["ia", "automatizacion"],
          tag: ["tutorial"]
        }
      };
      
      seedData.content.posts.push(newPost);
      addedCount++;
      console.log(`Added: [${locale.toUpperCase()}] ${title}`);
    }
    
    fs.writeFileSync(SEED_FILE, JSON.stringify(seedData, null, '\t'));
    console.log(`\nSuccessfully imported ${addedCount} posts into seed.json!`);
    console.log(`Run 'npx emdash seed seed/seed.json' or restart 'npx emdash dev' to apply to your local database.`);
    
  } catch (error) {
    console.error('Error importing blogs:', error);
  }
}

importBlogs();
