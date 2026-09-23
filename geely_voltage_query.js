// 吉利电压 - 主动查询模式（Loon cron 定时执行）
// ⚠️ 以下请求头来自抓包，authorization 约7天过期，过期后需重新抓包替换

const HEADERS = {
    "x-api-signature-nonce": "5E55A6CF-B0C6-4E29-980F-39A0CC6A7952",
    "x-app-id": "GEELYCNCH001M0001",
    "x-api-signature-version": "2.1",
    "x-device-model": "iPhone16,2",
    "x-vehicle-identifier": "hx+szNhuRNptTSxGHUYdxROrxxN1+MRCRsO6D9Xuy+A=",
    "x-vehicle-series": "S1gxMS1BNS1ERlk=",
    "x-device-id": "8C355C62-6159-40D7-A4CF-14991AB63312",
    "x-vehicle-brand": "GEELY",
    "x-tsp-platform": "3",
    "x-device-os-version": "27.0",
    "x-app-version": "3.52.0",
    "x-signature": "从抓包复制最新值",
    "x-platform": "iOS",
    "authorization": "eyJraWQiOiJm...从抓包复制最新token...",
    "accept": "application/json",
    "accept-language": "zh_CN",
    "x-sales-platform": "GEELY",
    "x-tenant-id": "GEELY",
    "x-timestamp": String(Date.now()),
    "user-agent": "GLMainProject/3.52.0 (com.geely.consumer; build:35200040; iOS 27.0.0) Alamofire/5.11.1"
};

const URL = "https://gric-g-api.geely.com/ms-vehicle-status/api/v2.0/vehicle/status/latest";

$httpClient.get({ url: URL, headers: HEADERS }, (err, resp, body) => {
    if (err) {
        console.log("[吉利电压] 请求失败: " + err);
        $done();
        return;
    }
    try {
        const data = JSON.parse(body);
        const maint = data?.data?.additionalMaintenanceStatus;
        if (maint && maint.voltage) {
            const voltage = maint.voltage;
            const odometer = maint.odometer || "-";
            $persistentStore.write(voltage, "geely_voltage");
            $persistentStore.write(new Date().toISOString(), "geely_voltage_time");
            console.log(`[吉利电压] 查询成功: ${voltage}V / ${odometer}km`);
            if (parseFloat(voltage) > 0 && parseFloat(voltage) < 12.0) {
                $notification.post("⚠️ 电瓶电压偏低", `当前电压 ${voltage}V`, "建议启动车辆或检查电瓶");
            }
        } else {
            console.log("[吉利电压] 响应异常: " + body.slice(0, 200));
        }
    } catch (e) {
        console.log("[吉利电压] 解析失败: " + e);
    }
    $done();
});