/**
 * Bilibili gRPC 广告净化脚本 (修复优化版)
 * 更新日期: 2026.09.29
 * 功能: 去除播放页广告、动态页最常访问UP主
 * 优化: 1. 增加严格白名单，避免误伤评论区和其他接口
 *       2. 增加异常捕获，防止 Protobuf 解析失败导致页面崩溃
 *       3. 修复路径不匹配时 body 未定义直接报错的问题
 */

const url = $request.url;
const method = $request.method;

console.log(`b站proto净化 - 2026.09.29`);

// 1. 异常拦截：只处理 POST 请求
if (method !== "POST") {
    $done({});
    return;
}

// 2. 异常拦截：防止响应体为空
if (!$response || !$response.body) {
    $done({});
    return;
}

// 3. 核心修复：白名单控制，只处理目标 gRPC 接口
const targetUrls = [
    "viewunite.v1.View/View", // 播放页主接口
    "Dynamic/DynAll"          // 动态页接口
];

const shouldProcess = targetUrls.some(target => url.includes(target));
if (!shouldProcess) {
    // 直接放行，不修改任何数据（解决评论区、相关视频等被误伤的问题）
    $done({});
    return;
}

let headers = $response.headers || {};
const isQuanX = typeof $task !== "undefined";
const binaryBody = isQuanX ? new Uint8Array($response.bodyBytes) : $response.body;

let gzipStrName = 'grpc-encoding';
if (!headers[gzipStrName]) {
    gzipStrName = 'Grpc-Encoding';
}

const isGzipCompress = headers[gzipStrName] === 'gzip';
console.log(`isGzipCompress: ${isGzipCompress}`);

// 提取非 gRPC 头部的二进制数据（前 5 个字节是 gRPC 的帧头，需要跳过）
let unGzipBody;
try {
    // 如果是 gzip 压缩的，先解压再跳过前 5 字节；否则直接跳过前 5 字节
    unGzipBody = isGzipCompress ? pako.ungzip(binaryBody.slice(5)) : binaryBody.slice(5);
    headers[gzipStrName] = 'identity'; // 解压后或跳过压缩标记，通知客户端内容未压缩
} catch (e) {
    console.log(`解压或读取二进制失败: ${e.message}`);
    $done({}); // 解压失败，原样放行
    return;
}

let body;
try {
    // 4. 业务逻辑处理
    if (url.includes("viewunite.v1.View/View")) {
        console.log('新视频播放页 viewunite View');
        const viewReplyObj = ViewReply.fromBinary(unGzipBody, { readUnknownField: true });
        
        // 去除播放页广告
        if (viewReplyObj.cm?.sourceContent?.length) {
            console.log('去除 cm.sourceContent 广告');
            viewReplyObj.cm.sourceContent = [];
        }
        if (viewReplyObj.cm?.sourceContentItem?.length) {
            viewReplyObj.cm.sourceContentItem.forEach(item => {
                if (item.sourceContent) {
                    console.log('去除 sourceContentItem-sourceContent 广告');
                    item.sourceContent = null;
                }
            });
        }
        body = processNewBody(ViewReply.toBinary(viewReplyObj));
        
    } else if (url.includes("Dynamic/DynAll")) {
        console.log('动态 DynAll');
        const dynAllReplyObj = DynAllReply.fromBinary(unGzipBody, { readUnknownField: true });
        
        // 去除最常访问UP主
        if (dynAllReplyObj.upList) {
            dynAllReplyObj.upList = null;
            console.log('去除最常访问 upList');
        }
        body = processNewBody(DynAllReply.toBinary(dynAllReplyObj));
    }
} catch (err) {
    console.log(`处理 Protobuf 时发生错误: ${url} - ${err.message}`);
    // 发生错误时，放弃修改，返回原始数据，避免破坏页面
    $done({});
    return;
}

// 5. 统一输出修改后的数据
if (isQuanX) {
    $done({
        bodyBytes: body.buffer.slice(body.byteOffset, body.byteLength + body.byteOffset),
        headers
    });
} else {
    $done({
        body,
        headers
    });
}

// --- 辅助函数 ---

function processNewBody(unGzipBody) {
    const length = unGzipBody.length;
    let merge = new Uint8Array(5 + length);
    merge.set(intToUint8Array(length), 1);
    merge.set(unGzipBody, 5);
    return merge;
}

function intToUint8Array(num) {
    let arr = new ArrayBuffer(4); // an Int32 takes 4 bytes
    let view = new DataView(arr);
    view.setUint32(0, num, false); // byteOffset = 0; litteEndian = false
    return new Uint8Array(arr);
}