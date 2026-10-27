/*
 * ABC Learning 解锁脚本 v3.0
 * 适用：Quantumult X（Surge/Loon/Stash 见文末头部改法）
 *
 * 处理逻辑：
 *   1. /api/v1/learning/book/list    → 每本书 is_free = 1
 *   2. /api/v1/learning/book/* 详情  → is_free = 1
 *      word_preview / book_reading / questions / book_guide 的 open = true
 *
 * [rewrite_local]
 * ^https?:\/\/ios\.abc-learning\.net\/api\/v\d+\/learning\/book\/ url script-response-body http://script.hub/file/_start_/https://raw.githubusercontent.com/xjbc123/xjbc123/refs/heads/main/ABClearning/ABCLearning.js/_end_/ABCLearning.plugin?type=qx-rewrite&target=loon-plugin&del=true&jqEnabled=true
 *
 * [mitm]
 * hostname = ios.abc-learning.net, *.abc-learning.net
 */

const LOG = true;

function log(msg) {
  if (LOG) console.log('[ABCLearning] ' + msg);
}

/* 书库列表：data.book_list[] */
function patchBookList(data, changed) {
  if (!Array.isArray(data.book_list)) return;
  data.book_list.forEach(function (book, i) {
    if (!book || typeof book !== 'object') return;
    if (book.is_free !== 1) {
      changed.push('book_list[' + i + '].is_free: ' + book.is_free + ' -> 1');
      book.is_free = 1;
    }
  });
}

/* 详情：靠结构识别，不依赖路径，避免误伤其他接口 */
function isBookDetail(data) {
  return !!(data.book_reading || data.word_preview || data.questions || data.book_guide);
}

function patchBookDetail(data, changed) {
  if ('is_free' in data && data.is_free !== 1) {
    changed.push('is_free: ' + data.is_free + ' -> 1');
    data.is_free = 1;
  }
  ['word_preview', 'book_reading', 'questions', 'book_guide'].forEach(function (key) {
    var part = data[key];
    if (part && typeof part === 'object' && part.open !== true) {
      changed.push(key + '.open: ' + part.open + ' -> true');
      part.open = true;
    }
  });
}

(function () {
  try {
    if (typeof $response === 'undefined' || !$response || !$response.body) {
      return $done({});
    }

    var raw = typeof $response.body === 'string' ? $response.body : $response.body.toString();
    var body = JSON.parse(raw);
    var data = body && body.data;

    if (!data || typeof data !== 'object') {
      return $done({});
    }

    var changed = [];
    patchBookList(data, changed);
    if (isBookDetail(data)) {
      patchBookDetail(data, changed);
    }

    var url = (typeof $request !== 'undefined' && $request && $request.url) || '';
    if (changed.length) {
      log(url + ' | ' + changed.join(' | '));
      $response.body = JSON.stringify(body);
    } else {
      log(url + ' | no change');
    }

    $done({ body: $response.body });
  } catch (e) {
    log('error: ' + e);
    $done({});
  }
})();