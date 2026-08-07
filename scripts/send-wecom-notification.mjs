#!/usr/bin/env node

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const projectRoot = process.cwd()
const payloadPath = process.argv[2]

if (!payloadPath) {
  throw new Error('Usage: node scripts/send-wecom-notification.mjs <payload.json>')
}

const webhookPath = resolve(projectRoot, '.automation/secrets/wecom-webhook-url')
const webhook = (await readFile(webhookPath, 'utf8')).trim()
const webhookUrl = new URL(webhook)

if (
  webhookUrl.protocol !== 'https:' ||
  webhookUrl.hostname !== 'qyapi.weixin.qq.com' ||
  webhookUrl.pathname !== '/cgi-bin/webhook/send'
) {
  throw new Error('The configured WeCom webhook URL is invalid')
}

const payload = JSON.parse(await readFile(resolve(projectRoot, payloadPath), 'utf8'))
const status = payload.status === 'success' ? '完成' : '失败'
const lines = [
  `【GitHub AI 热门速报】${status}`,
  `日期：${payload.date}`,
  `收集：${Number(payload.itemCount ?? 0)} 项`,
]

for (const item of (payload.topItems ?? []).slice(0, 3)) {
  lines.push(`- ${item.name}：${item.summary}`)
}

if (payload.reportPath) {
  lines.push(`文档：${payload.reportPath}`)
}

if (payload.message) {
  lines.push(`说明：${payload.message}`)
}

const content = lines.join('\n').slice(0, 1800)
const response = await fetch(webhookUrl, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ msgtype: 'text', text: { content } }),
})

if (!response.ok) {
  throw new Error(`WeCom webhook returned HTTP ${response.status}`)
}

const result = await response.json()
if (result.errcode !== 0) {
  throw new Error(`WeCom webhook failed with code ${result.errcode}`)
}

console.log('WeCom notification sent successfully')
