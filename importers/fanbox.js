const { posts, bans } = require('../db');
const request = require('request-promise');
const retry = require('p-retry');
const path = require('path');
const indexer = require('../indexer');
const { unraw } = require('unraw');
const nl2br = require('nl2br');
const checkForFlags = require('../flagcheck');
const downloadFile = require('../download');
const Promise = require('bluebird');

const requestOptions = (key) => {
  return {
    json: true,
    headers: {
      cookie: `FANBOXSESSID=${key}`,
      origin: 'https://fanbox.cc'
    }
  };
};

const fileRequestOptions = (key) => {
  return {
    encoding: null,
    headers: {
      cookie: `FANBOXSESSID=${key}`,
      origin: 'https://fanbox.cc'
    }
  };
};

async function scraper (key, url = 'https://api.fanbox.cc/post.listSupporting?limit=50') {
  const fanbox = await retry(() => request.get(url, requestOptions(key)));
  Promise.map(fanbox.body.items, async (post) => {
    if (!post.body) return; // locked content; nothing to do
    const banExists = await bans.findOne({ id: post.user.userId, service: 'fanbox' });
    if (banExists) return;

    await checkForFlags({
      service: 'fanbox',
      entity: 'user',
      entityId: post.user.userId,
      id: post.id
    });

    const postExists = await posts.findOne({ id: post.id, service: 'fanbox' });
    if (postExists) return;

    const model = {
      version: 2,
      service: 'fanbox',
      title: unraw(post.title),
      content: nl2br(unraw(await parseBody(post.body, key, {
        id: post.id,
        user: post.user.userId
      }), true)),
      id: post.id,
      user: post.user.userId,
      post_type: post.type, // image, article, embed, or file
      published_at: post.publishedDatetime,
      added_at: new Date().getTime(),
      embed: {},
      post_file: {},
      attachments: []
    };

    const filesLocation = '/files/fanbox';
    const attachmentsLocation = '/attachments/fanbox';
    if (post.body.images) {
      await Promise.mapSeries(post.body.images, async (image, index) => {
        const location = index === 0 && !model.post_file.name ? filesLocation : attachmentsLocation;
        const store = index === 0 && !model.post_file.name ? fn => {
          model.post_file.name = `${image.id}.${image.extension}`;
          model.post_file.path = `${location}/${post.user.userId}/${post.id}/${fn}`;
        } : fn => {
          model.attachments.push({
            id: image.id,
            name: `${image.id}.${image.extension}`,
            path: `${attachmentsLocation}/${post.user.userId}/${post.id}/${fn}`
          });
        };
        await downloadFile({
          ddir: path.join(process.env.DB_ROOT, `${location}/${post.user.userId}/${post.id}`),
          name: `${image.id}.${image.extension}`
        }, Object.assign({
          url: unraw(image.originalUrl)
        }, fileRequestOptions(key)))
          .then(res => store(res.filename));
      });
    }

    if (post.body.files) {
      await Promise.mapSeries(post.body.files, async (file, index) => {
        const location = index === 0 && !model.post_file.name ? filesLocation : attachmentsLocation;
        const store = index === 0 && !model.post_file.name ? fn => {
          model.post_file.name = `${file.name}.${file.extension}`;
          model.post_file.path = `${location}/${post.user.userId}/${post.id}/${fn}`;
        } : fn => {
          model.attachments.push({
            id: file.id,
            name: `${file.name}.${file.extension}`,
            path: `${attachmentsLocation}/${post.user.userId}/${post.id}/${fn}`
          });
        };
        await downloadFile({
          ddir: path.join(process.env.DB_ROOT, `${location}/${post.user.userId}/${post.id}`),
          name: `${file.name}.${file.extension}`
        }, Object.assign({
          url: unraw(file.url)
        }, fileRequestOptions(key)))
          .then(res => store(res.filename));
      });
    }

    await posts.insertOne(model);
  });

  if (fanbox.body.nextUrl) {
    scraper(key, fanbox.body.nextUrl);
  } else {
    indexer();
  }
}

async function parseBody (body, key, opts) {
  // https://github.com/Nandaka/PixivUtil2/blob/master/PixivModelFanbox.py#L213
  const bodyText = body.text || body.html || '';
  let concatenatedText = '';
  if (body.blocks) {
    await Promise.mapSeries(body.blocks, async (block) => {
      switch (block.type) {
        case 'p': {
          concatenatedText += block.text ? `${unraw(block.text)}<br>` : '';
          break;
        }
        case 'image': {
          const imageInfo = body.imageMap[block.imageId];
          await downloadFile({
            ddir: path.join(process.env.DB_ROOT, '/inline/fanbox'),
            name: `${imageInfo.id}.${imageInfo.extension}`
          }, Object.assign({
            url: unraw(imageInfo.originalUrl)
          }, fileRequestOptions(key)))
            .then(res => {
              concatenatedText += `<img src="/inline/fanbox/${res.filename}"><br>`;
            });
          break;
        }
        case 'file': {
          const fileInfo = body.fileMap[block.fileId];
          await downloadFile({
            ddir: path.join(process.env.DB_ROOT, `/attachments/fanbox/${opts.user}/${opts.id}`),
            name: unraw(`${fileInfo.name || fileInfo.id}.${fileInfo.extension}`)
          }, Object.assign({
            url: unraw(fileInfo.url)
          }, fileRequestOptions(key)))
            .then(res => {
              concatenatedText += `<a href="/attachments/fanbox/${opts.user}/${opts.id}/${res.filename}" target="_blank">Download ${res.filename}</a><br>`;
            });
          break;
        }
        case 'embed': {
          const embedInfo = body.embedMap[block.embedId];
          const embed = ({
            twitter: `
              <a href="https://twitter.com/_/status/${embedInfo.contentId}" target="_blank">
                <div class="embed-view">
                  <h3 class="subtitle">(Twitter)</h3>
                </div>
              </a>
              <br>
            `,
            youtube: `
              <a href="https://www.youtube.com/watch?v=${embedInfo.contentId}" target="_blank">
                <div class="embed-view">
                  <h3 class="subtitle">(YouTube)</h3>
                </div>
              </a>
              <br>
            `,
            fanbox: `
              <a href="https://www.pixiv.net/fanbox/${embedInfo.contentId}" target="_blank">
                <div class="embed-view">
                  <h3 class="subtitle">(Fanbox)</h3>
                </div>
              </a>
              <br>
            `,
            vimeo: `
              <a href="https://vimeo.com/${embedInfo.contentId}" target="_blank">
                <div class="embed-view">
                  <h3 class="subtitle">(Vimeo)</h3>
                </div>
              </a>
              <br>
            `,
            google_forms: `
              <a href="https://docs.google.com/forms/d/e/${embedInfo.contentId}/viewform?usp=sf_link" target="_blank">
                <div class="embed-view">
                  <h3 class="subtitle">(Google Forms)</h3>
                </div>
              </a>
              <br>
            `,
            soundcloud: `
              <a href="https://soundcloud.com/${embedInfo.contentId}" target="_blank">
                <div class="embed-view">
                  <h3 class="subtitle">(Soundcloud)</h3>
                </div>
              </a>
              <br>
            `
          })[embedInfo.serviceProvider];
          concatenatedText += embed;
          break;
        }
      }
    });
  }

  return `${bodyText}<br>${concatenatedText}`;
}

module.exports = key => scraper(key);