const got = require('@/utils/got');
const cheerio = require('cheerio');
const url = require('url');
 
// url
const host = 'http://81rc.81.cn'
const link = 'http://81rc.81.cn/sy/gzdt_210283/index.html';
 
 
module.exports = async (ctx) => {
    // 获取列表页
    const response = await got({
        method: 'get',
        url: link,
    });
    // 用 cheerio 来把请求回来的数据转成 DOM
    const $ = cheerio.load(response.data);
 
    // 提取列表项
    const urlList = $('.left-news')
		.find('ul')
		.find('li')
        .find('a')
        .slice(0, 30)
        .map((i, e) => $(e).attr('href'))
        .get();
 
    // 设置一下要输出的文章项
    const out = await Promise.all(
        urlList.map(async (itemUrl) => {
            // 这里是使用 RSSHub 的缓存机制
            const cache = await ctx.cache.get(itemUrl);
            if (cache) {
                return Promise.resolve(JSON.parse(cache));
            }
 
            // 获取列表项中的网页内容，也就是一篇文章
            const response = await got.get(itemUrl);
            const $ = cheerio.load(response.data);
 
            // single 就是一篇文章了，里面包括了标题、链接、内容和时间
            const single = {
                title: $('TITLE').text(),
                link: itemUrl,
                description: $('.wrapper')
                    .html()
                    .replace(/src="\//g, `src="${url.resolve(host, '.')}`)
                    .replace(/href="\//g, `href="${url.resolve(host, '.')}`)
                    .trim(),
                pubDate: new Date(
                    $('.time')
					.find('span')
					.slice(2, 3)
                    .text()
                ).toUTCString(),
            };
 
            ctx.cache.set(itemUrl, JSON.stringify(single), 24 * 60 * 60);
 
            return Promise.resolve(single);
        })
    );
 
    // 这里就是设置一下 RSS 链接显示的标题了
    let info = '军队人才网工作动态';
 
    // 最后设置一下 RSS 链接里面包含的内容，item 就是输出的各个文章项
    ctx.state.data = {
        title: info,
        link: link,
        description: info + '--> 实时监控录用名单',
        item: out,
    };
};
