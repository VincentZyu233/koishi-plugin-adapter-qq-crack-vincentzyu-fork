<template>
  <k-layout main="qq-command-panel-layout">
    <template #header>QQ 指令面板</template>
    <el-scrollbar class="qq-command-panel-scrollbar">
      <main class="qq-command-panel-page">
        <header class="qq-command-panel-header">
          <div><h1>QQ 指令面板</h1><p>只会更新由本插件创建的面板。</p></div>
          <k-button @click="load" :disabled="loading">刷新</k-button>
        </header>
        <section class="qq-command-panel-content">
          <label v-if="bots.length" class="qq-command-panel-field">机器人
            <select v-model="botId" @change="load"><option v-for="bot in bots" :key="bot.id" :value="bot.id">{{ bot.name }} / {{ bot.id }}</option></select>
          </label>
          <k-comment v-if="!loading && !bots.length" type="warning">没有已启用指令面板的 QQ 机器人。请在该适配器实例配置中开启 enableCommandPanel，然后重载插件。</k-comment>
          <p v-if="state" class="qq-command-panel-hint">当前模式：{{ state.mode }}。自动模式的勾选由配置生成；手动模式可在此保存选择。</p>
          <div v-if="state" class="qq-command-panel-commands">
            <label v-for="command in state.commands" :key="command.name" class="qq-command-panel-command" :class="{ invalid: command.reason }">
              <input v-model="selected" type="checkbox" :value="command.name" :disabled="Boolean(command.reason) || state.mode !== 'manual'" />
              <span><strong>{{ command.name }}</strong><small>{{ command.description }}</small><em v-if="command.reason">{{ command.reason }}</em></span>
            </label>
          </div>
          <div v-if="state" class="qq-command-panel-actions"><k-button type="primary" @click="save" :disabled="state.mode !== 'manual'">保存手动选择</k-button><k-button type="primary" @click="sync">同步到 QQ</k-button></div>
          <section v-if="state" class="qq-command-panel-menu"><h2>单聊全局菜单</h2><textarea v-model="menuJson" rows="12" spellcheck="false" /><k-button @click="saveMenu">保存菜单</k-button></section>
          <k-comment v-if="message" :type="message.ok ? 'success' : 'error'">{{ message.text }}</k-comment>
        </section>
      </main>
    </el-scrollbar>
  </k-layout>
</template>

<script setup lang="ts">
import { send } from '@koishijs/client'
import { onMounted, ref } from 'vue'

interface Command { name: string, description: string, reason?: string, selected: boolean }
interface State { preference: { scopes: Array<'c2c' | 'group'> }, commands: Command[], menu: { menu?: unknown }, mode: string }
const bots = ref<Array<{ id: string, name: string }>>([])
const botId = ref('')
const state = ref<State>()
const selected = ref<string[]>([])
const menuJson = ref('{\n  "items": []\n}')
const loading = ref(false)
const message = ref<{ ok: boolean, text: string }>()

async function load() {
  if (!botId.value) return
  loading.value = true; message.value = undefined
  try {
    state.value = await send('qq-crack/panel-state' as any, { botId: botId.value })
    selected.value = state.value.commands.filter(command => command.selected).map(command => command.name)
    menuJson.value = JSON.stringify(state.value.menu.menu || { items: [] }, null, 2)
  } catch (error) { message.value = { ok: false, text: String(error) } } finally { loading.value = false }
}
async function save() {
  try { await send('qq-crack/panel-save' as any, { botId: botId.value, commands: selected.value, scopes: state.value!.preference.scopes }); message.value = { ok: true, text: '手动选择已保存' } } catch (error) { message.value = { ok: false, text: String(error) } }
}
async function sync() {
  try { await send('qq-crack/panel-sync' as any, { botId: botId.value }); message.value = { ok: true, text: 'QQ 指令面板已同步' } } catch (error) { message.value = { ok: false, text: String(error) } }
}
async function saveMenu() {
  try {
    await send('qq-crack/menu-save' as any, { botId: botId.value, menu: JSON.parse(menuJson.value) })
    message.value = { ok: true, text: '单聊全局菜单已保存' }
  } catch (error) {
    message.value = { ok: false, text: error instanceof Error ? error.message : String(error) }
  }
}
onMounted(async () => {
  try {
    bots.value = await send('qq-crack/panel-bots' as any)
    botId.value = bots.value[0]?.id || ''
    await load()
  } catch (error) {
    message.value = { ok: false, text: error instanceof Error ? error.message : String(error) }
  }
})
</script>

<style lang="scss" scoped>
.qq-command-panel-scrollbar { width: 100%; height: 100%; }
.qq-command-panel-page { box-sizing: border-box; width: 100%; min-width: 0; min-height: 100%; color: var(--fg1, var(--k-color-fg)); background: var(--k-main-bg, var(--k-color-bg)); }
.qq-command-panel-header, .qq-command-panel-content { padding: 24px clamp(18px, 4vw, 48px); }
.qq-command-panel-header, .qq-command-panel-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.qq-command-panel-header { border-bottom: 1px solid var(--k-color-divider, var(--k-color-border)); background: var(--k-card-bg, var(--k-color-bg)); }
h1, h2, p { margin: 0; } h1 { font-size: 24px; } h2 { font-size: 18px; }
.qq-command-panel-header p, .qq-command-panel-hint, small { color: var(--fg2, var(--k-color-muted)); }
.qq-command-panel-content { display: flex; box-sizing: border-box; width: 100%; min-width: 0; max-width: 980px; flex-direction: column; gap: 16px; }
.qq-command-panel-field { display: flex; flex-direction: column; gap: 6px; font-weight: 600; max-width: 680px; }
select, textarea { box-sizing: border-box; width: 100%; min-width: 0; border: 1px solid var(--k-color-divider, var(--k-color-border)); border-radius: 6px; padding: 8px; color: var(--fg1, var(--k-color-fg)); background: var(--k-card-bg, var(--k-color-bg)); font: inherit; }
.qq-command-panel-commands { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 8px; width: 100%; }.qq-command-panel-command { display: flex; gap: 9px; min-width: 0; padding: 9px; border: 1px solid var(--k-color-divider, var(--k-color-border)); border-radius: 6px; background: var(--k-card-bg, var(--k-color-bg)); }.qq-command-panel-command span { display: flex; flex-direction: column; gap: 3px; min-width: 0; }.qq-command-panel-command strong, .qq-command-panel-command small, .qq-command-panel-command em { overflow-wrap: anywhere; }.qq-command-panel-command em { color: var(--k-color-danger); font-style: normal; font-size: 12px; }.invalid { opacity: .65; }.qq-command-panel-menu { display: flex; flex-direction: column; gap: 8px; width: min(100%, 760px); } textarea { font-family: ui-monospace, monospace; resize: vertical; }
@media (max-width: 720px) { .qq-command-panel-header, .qq-command-panel-content { padding: 18px 14px; } .qq-command-panel-header { align-items: flex-start; } }
</style>
