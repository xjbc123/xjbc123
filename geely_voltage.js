// 吉利电压 - 拦截模式（配合吉利App自身请求，无需担心签名过期）
// 原理：App自己请求车况接口时，Loon拦截响应体，提取电压并存入持久化存储

const body = $response.body;
try {
    const data = JSON.parse(body);
    const maint = data?.data?.additionalMaintenanceStatus;
    if (maint && maint.voltage) {
        const voltage = maint.voltage;
        const odometer = maint.odometer || "-";
        $persistentStore.write(voltage, "geely_voltage");
        $persistentStore.write(new Date().toISOString(), "geely_voltage_time");
        $persistentStore.write(odometer, "geely_odometer");
        console.log(`[吉利电压] ${voltage}V 里程${odometer}km`);
        // 低压提醒
        if (parseFloat(voltage) > 0 && parseFloat(voltage) < 12.0) {
            $notification.post("⚠️ 电瓶电压偏低", `当前电压 ${voltage}V`, "建议启动车辆或检查电瓶");
        }
    }
} catch (e) {
    console.log("[吉利电压] 解析失败: " + e);
}
$done({});