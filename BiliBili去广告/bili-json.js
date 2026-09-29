/**
 * Bilibili 广告净化脚本 (修复优化版)
 * 更新日期: 2026.09.29
 * 功能: 去除开屏广告、顶部/底部Tab冗余项、推荐页信息流广告
 * 优化: 1. 增加严格的白名单，避免误伤评论区、播放页等相关接口
 *       2. 增加 JSON 解析异常捕获，防止空数据导致页面卡死
 *       3. 去除无用通知，提高脚本性能
 */

const url = $request.url;
const method = $request.method;
const notifyTitle = "bilibili-json";

console.log(`b站json净化 - 2026.09.29`);

// 1. 异常拦截：只处理 GET 请求
if (method !== "GET") {
    $done({});
    return;
}

// 2. 异常拦截：防止响应体为空导致解析崩溃
if (!$response || !$response.body) {
    $done({});
    return;
}

// 3. 核心修复：严格白名单，只处理目标广告接口，其余一律直接放行
const targetUrls = [
    "x/v2/splash",           // 开屏广告
    "resource/show/tab/v2",  // 顶部/底部Tab
    "x/v2/feed/index"        // 推荐页信息流
];

// 判断当前请求是否在我们的处理范围内，不在则直接放行（解决评论区问题）
const shouldProcess = targetUrls.some(target => url.includes(target));
if (!shouldProcess) {
    // 直接返回原始数据，不进行任何修改，确保评论区、视频流等正常
    $done({});
    return;
}

// 4. 安全解析 JSON
let body;
try {
    body = JSON.parse($response.body);
} catch (e) {
    console.log(`JSON解析失败，跳过处理: ${url}`);
    $done({});
    return;
}

if (!body || !body.data) {
    console.log(`body或data字段错误: ${url}`);
    $done({});
    return;
}

// 5. 业务逻辑处理
try {
    // 【开屏广告处理】
    if (url.includes("x/v2/splash")) {
        console.log('开屏页' + (url.includes("splash/show") ? 'show' : 'list'));
        if (body.data.show) {
            delete body.data.show;
            console.log('开屏广告已去除');
        }
    } 
    // 【顶部与底部Tab处理】
    else if (url.includes("resource/show/tab/v2")) {
        console.log('Tab修改');
        // 顶部右上角
        if (body.data.top && Array.isArray(body.data.top)) {
            body.data.top = body.data.top.filter(item => item.name !== '游戏中心');
            fixPos(body.data.top);
        }
        // 底部Tab栏
        if (body.data.bottom && Array.isArray(body.data.bottom)) {
            body.data.bottom = body.data.bottom.filter(item => {
                return item.name !== '发布' && 
                       item.name !== '会员购' && 
                       item.tab_id !== '会员购Bottom';
            });
            fixPos(body.data.bottom);
        }
    } 
    // 【推荐页信息流广告处理】
    else if (url.includes("x/v2/feed/index")) {
        console.log('推荐页处理');
        if (body.data.items && Array.isArray(body.data.items)) {
            body.data.items = body.data.items.filter(i => {
                const cardType = i.card_type;
                const cardGoto = i.card_goto;

                if (!cardType || !cardGoto) return true; // 缺少字段则保留

                // Banner 广告
                if (cardType === 'banner_v8' && cardGoto === 'banner') {
                    if (i.banner_item && Array.isArray(i.banner_item)) {
                        // 过滤掉 banner_item 中的广告
                        i.banner_item = i.banner_item.filter(v => v.type !== 'ad');
                        // 如果过滤完后 banner_item 为空，则连整个 card 一起移除
                        return i.banner_item.length > 0;
                    }
                    return true;
                }
                
                // 信息流小/大广告
                const adGotos = ['ad_web_s', 'ad_av', 'ad_web_gif', 'ad_player', 'ad_inline_3d', 'ad_inline_eggs'];
                if (cardType === 'cm_v2' && adGotos.includes(cardGoto)) {
                    console.log(`去除广告类型: ${cardGoto}`);
                    return false;
                }
                
                // 游戏广告与创作推广
                if (cardType === 'small_cover_v10' && cardGoto === 'game') return false;
                if (cardType === 'cm_double_v9' && cardGoto === 'ad_inline_av') return false;

                return true;
            });
        }
    }
} catch (err) {
    console.log(`处理业务逻辑时发生错误: ${url} - ${err.message}`);
    // 发生错误时，放弃修改，返回原始数据，避免破坏页面
    $done({});
    return;
}

// 6. 统一输出修改后的数据
body = JSON.stringify(body);
$done({
    body
});

// 辅助函数：修复 pos 序号
function fixPos(arr) {
    if (!Array.isArray(arr)) return;
    for (let i = 0; i < arr.length; i++) {
        arr[i].pos = i + 1;
    }
}