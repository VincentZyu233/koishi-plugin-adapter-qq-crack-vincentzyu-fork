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
          <k-comment v-if="!loading && !bots.length" type="warning">当前没有已连接的 QQ 机器人。</k-comment>
          <k-comment v-else-if="selectedBot && !selectedBot.enabled" type="warning">该 QQ 机器人已连接，但指令面板功能未启用。请开启 enableCommandPanel，然后重载插件。</k-comment>
          <div v-if="state" class="qq-command-panel-summary">
            <div><span>选择模式</span><strong>{{ modeLabel }}</strong></div>
            <div><span>已选指令</span><strong>{{ selected.length }} / 20</strong></div>
          </div>
          <fieldset v-if="state" class="qq-command-panel-scopes">
            <legend>生效场景</legend>
            <label><input v-model="scopes" type="checkbox" value="c2c" :disabled="state.mode !== 'manual'" /> 单聊</label>
            <label><input v-model="scopes" type="checkbox" value="group" :disabled="state.mode !== 'manual'" /> 群聊</label>
          </fieldset>
          <div v-if="state" class="qq-command-panel-section-heading"><h2>Koishi 指令</h2><span>{{ state.commands.length }} 条可见</span></div>
          <div v-if="state" class="qq-command-panel-commands">
            <label v-for="command in state.commands" :key="command.name" class="qq-command-panel-command" :class="{ invalid: command.reason }">
              <input v-model="selected" type="checkbox" :value="command.name" :disabled="Boolean(command.reason) || state.mode !== 'manual'" />
              <span><strong>{{ command.name }}</strong><small>{{ command.description }}</small><em v-if="command.reason">{{ command.reason }}</em></span>
            </label>
          </div>
          <div v-if="state" class="qq-command-panel-actions"><k-button @click="save" :disabled="state.mode !== 'manual' || !scopes.length">保存选择</k-button><k-button type="primary" @click="sync" :disabled="!selected.length">同步指令面板</k-button></div>
          <section v-if="state" class="qq-command-panel-menu"><div class="qq-command-panel-section-heading"><h2>单聊全局菜单</h2><span v-if="state.menuError" class="error">读取失败</span></div><k-comment v-if="state.menuError" type="warning">{{ state.menuError }}</k-comment><textarea v-model="menuJson" rows="12" spellcheck="false" /><k-button @click="saveMenu">保存全局菜单</k-button></section>
          <k-comment v-if="message" :type="message.ok ? 'success' : 'error'">{{ message.text }}</k-comment>
        </section>
      </main>
    </el-scrollbar>
  </k-layout>
</template>

<script setup lang="ts">
import { send } from '@koishijs/client'
import { computed, onMounted, ref } from 'vue'

interface Command { name: string, description: string, reason?: string, selected: boolean }
interface State { preference: { scopes: Array<'c2c' | 'group'> }, commands: Command[], menu?: { menu?: unknown }, menuError?: string, mode: string }
const bots = ref<Array<{ id: string, name: string, enabled: boolean }>>([])
const botId = ref('')
const selectedBot = computed(() => bots.value.find(bot => bot.id === botId.value))
const state = ref<State>()
const selected = ref<string[]>([])
const scopes = ref<Array<'c2c' | 'group'>>([])
const modeLabel = computed(() => ({ manual: '手动', 'alphabetical-first': '字典序前 20', 'alphabetical-last': '字典序后 20', random: '随机 20' }[state.value?.mode || ''] || state.value?.mode))
const menuJson = ref('{\n  "items": []\n}')
const loading = ref(false)
const message = ref<{ ok: boolean, text: string }>()

async function load() {
  if (!botId.value || !selectedBot.value?.enabled) {
    state.value = undefined
    return
  }
  loading.value = true; message.value = undefined
  try {
    state.value = await send('qq-crack/panel-state' as any, { botId: botId.value })
    selected.value = state.value.commands.filter(command => command.selected).map(command => command.name)
    scopes.value = [...state.value.preference.scopes]
    menuJson.value = JSON.stringify(state.value.menu?.menu || { items: [] }, null, 2)
  } catch (error) { message.value = { ok: false, text: String(error) } } finally { loading.value = false }
}
async function save() {
  try { await send('qq-crack/panel-save' as any, { botId: botId.value, commands: selected.value, scopes: scopes.value }); message.value = { ok: true, text: '手动选择已保存' } } catch (error) { message.value = { ok: false, text: String(error) } }
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
    botId.value = bots.value.find(bot => bot.enabled)?.id || bots.value[0]?.id || ''
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
.qq-command-panel-summary { display: grid; grid-template-columns: repeat(2, minmax(120px, 220px)); gap: 12px; }.qq-command-panel-summary div { display: grid; gap: 3px; }.qq-command-panel-summary span, .qq-command-panel-section-heading span { color: var(--fg2, var(--k-color-muted)); font-size: 12px; }.qq-command-panel-summary strong { font-size: 16px; }
.qq-command-panel-scopes { display: flex; gap: 18px; margin: 0; padding: 12px; border: 1px solid var(--k-color-divider, var(--k-color-border)); border-radius: 6px; }.qq-command-panel-scopes legend { padding: 0 5px; font-weight: 600; }.qq-command-panel-scopes label { display: inline-flex; align-items: center; gap: 6px; }
.qq-command-panel-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.qq-command-panel-section-heading .error { color: var(--k-color-danger); }
.qq-command-panel-commands { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 8px; width: 100%; }.qq-command-panel-command { display: flex; gap: 9px; min-width: 0; padding: 9px; border: 1px solid var(--k-color-divider, var(--k-color-border)); border-radius: 6px; background: var(--k-card-bg, var(--k-color-bg)); }.qq-command-panel-command span { display: flex; flex-direction: column; gap: 3px; min-width: 0; }.qq-command-panel-command strong, .qq-command-panel-command small, .qq-command-panel-command em { overflow-wrap: anywhere; }.qq-command-panel-command em { color: var(--k-color-danger); font-style: normal; font-size: 12px; }.invalid { opacity: .65; }.qq-command-panel-menu { display: flex; flex-direction: column; gap: 8px; width: min(100%, 760px); } textarea { font-family: ui-monospace, monospace; resize: vertical; }
@media (max-width: 720px) { .qq-command-panel-header, .qq-command-panel-content { padding: 18px 14px; } .qq-command-panel-header { align-items: flex-start; } }
</style>
