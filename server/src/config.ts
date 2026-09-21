import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT ?? 8787),
  /**
   * 凭据与使用者数据（沟通风格 / 关系记忆 / 情绪时间线）全部由浏览器 localStorage 持有，
   * 随请求传入；服务端无状态、不落盘、不读取密钥环境变量。
   */
  recentMessageLimit: 30,
}