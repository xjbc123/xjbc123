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
    "x-signature": "LMUH8AwuUYZy4VANCBxA3lxEB+lSJU9m2ZkvEAybKZ8=",
    "x-platform": "iOS",
    "authorization": "eyJraWQiOiJmNDgzZmI2ZGM3MTc0ZTEwYmQ0ZWM4NTk2NWE3ZjI4ZCIsInR5cCI6IkpXVCIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiI3MjYxMDY0NzU4NDc0OTAxMTE0Iiwib3BlbklkIjoiNzI2MTA2NDc1ODQ3NDkwMTExNCIsImlzcyI6Imh0dHBzOi8vZ3JpYy1taWQtaW5uZXIuZ2VlbHkuY29tL21zLWF1dGgtc2VydmljZS9pbm5lci92MS4wL29hdXRoL2luZm8iLCJ0eXAiOiJCZWFyZXIiLCJlbnYiOiJQUk9EIiwidXNlcklkIjoiMzYzODA1NDIiLCJkZXZpY2VJZCI6IjhDMzU1QzYyLTYxNTktNDBENy1BNENGLTE0OTkxQUI2MzMxMiIsInNpZCI6IjgxMWQzYzk4LWQwOTctNGU4Mi05ZWNiLTg0NjQ0YjlkMjcwNyIsImF1ZCI6ImF1dGhfY2xpZW50X2dlZWx5X3Bob25lIiwiYWNyIjoiMSIsIm5iZiI6MTc5MDA1NTk2MSwiYXpwIjoiYXV0aF9jbGllbnRfZ2VlbHlfcGhvbmUiLCJzY29wZSI6IiIsImV4cCI6MTc5MDY2MDc2MSwic2Vzc2lvbl9zdGF0ZSI6IjgxMWQzYzk4LWQwOTctNGU4Mi05ZWNiLTg0NjQ0YjlkMjcwNyIsImlhdCI6MTc5MDA1NTk2MSwiYnJhbmQiOiJHRUVMWSIsImp0aSI6ImVkZWQ5ZGQ3LWNmZWYtNGZlYi05NDlkLWIyMzcwMjU0OWUxOCJ9.ZypeaKs2qrdXNDfukzNJxVELN1TazNCvPUDFIBuJWElxri9wOzxJGT54YdmIY0u5TmkT0dLgBvE2swxJQxSCw9Vhc-NtLUcfse2ahWaF7smdbU-n1l4c0cpwru1Dz1fDv6VQPd9zxALenkHl55G1zvFbaKpWT7zdQAP_TWaPY2-WpsDV6cfEX4hGFb5C7UG_bvrt5Hc2H8Tk3vrR0gGVO_F5hUIg3NV97Y143_OY4NoyO0C-5qYKU8KJXMgaPRL1IFyHJyHfQzFiQeGlP5UgG5koqnAt4TWwTV_CoV4FRi4Qh98mfMKAfeLYFga3-QHJCOIAHdxkTROHFPfP-IVsQg",
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
