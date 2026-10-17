// The name of a mission folder under .crewsade/missions/
export type MissionSlug = string

declare module 'claude-code' {
  interface PluginState {
    // The mission folder this session's foreman works in, or null before it has one
    crewsade: { mission: MissionSlug | null }
  }
}
