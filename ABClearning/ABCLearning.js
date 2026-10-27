/*
ABCLearning 解锁 v3.2
[rewrite_local]
^https?:\/\/ios\.abc-learning\.net\/api\/v\d+\/learning\/ url script-response-body https://cdn.jsdelivr.net/gh/xjbc123/xjbc123@main/ABClearning/ABCLearning.js
[mitm]
hostname = ios.abc-learning.net, *.abc-learning.net
*/

const LOG = true;
function log(m) { if (LOG) console.log('[ABCLearning] ' + m); }

function deepPatch(node, path, changed) {
  if (Array.isArray(node)) {
    for (var i = 0; i < node.length; i++) deepPatch(node[i], path + '[' + i + ']', changed);
    return;
  }
  if (!node || typeof node !== 'object') return;

  // 1) 任何数字型 is_free 一律置 1
  if ('is_free' in node && node.is_free !== 1) {
    changed.push(path + '.is_free: ' + node.is_free + ' -> 1');
    node.is_free = 1;
  }

  // 2) 形如 {is_show, star, video, open:false} 的功能块，打开它
  var featureBlock = ('is_show' in node || 'star' in node || 'video' in node || 'video_md5' in node);
  if (featureBlock && typeof node.open === 'boolean' && node.open !== true) {
    changed.push(path + '.open: ' + node.open + ' -> true');
    node.open = true;
  }

  var keys = Object.keys(node);
  for (var j = 0; j < keys.length; j++) {
    deepPatch(node[keys[j]], path + '.' + keys[j], changed);
  }
}

(function () {
  try {
    if (typeof $response === 'undefined' || !$response || !$response.body) return $done({});

    var raw = typeof $response.body === 'string' ? $response.body : $response.body.toString();
    var body = JSON.parse(raw);
    var data = body && body.data;
    if (!data || typeof data !== 'object') return $done({});

    var changed = [];
    deepPatch(data, 'data', changed);

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