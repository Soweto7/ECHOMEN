import { SkillManifest, SkillRuntimeContext, SkillPermissionScope } from '../types';

const SKILL_ENABLED_STORAGE_KEY = 'echo-enabled-skills';
const SKILL_CONFLICT_STORAGE_KEY = 'echo-skill-conflicts';

const skillModules = import.meta.glob('../skills/manifests/*.json', { eager: true });

type SkillModule = { default: SkillManifest };

const TOOL_SCOPE_MAP: Record<string, { scope: SkillPermissionScope; capability: string; externalApi?: string }> = {
  readFile: { scope: 'filesystem', capability: 'filesystem' },
  writeFile: { scope: 'filesystem', capability: 'filesystem' },
  listFiles: { scope: 'filesystem', capability: 'filesystem' },
  executeShellCommand: { scope: 'shell', capability: 'shell' },
  browse_web: { scope: 'network', capability: 'web_research' },
  github_create_repo: { scope: 'external_api', capability: 'github', externalApi: 'github' },
  github_get_pr_details: { scope: 'external_api', capability: 'github', externalApi: 'github' },
  github_post_pr_comment: { scope: 'external_api', capability: 'github', externalApi: 'github' },
  github_merge_pr: { scope: 'external_api', capability: 'github', externalApi: 'github' },
  github_create_file_in_repo: { scope: 'external_api', capability: 'github', externalApi: 'github' },
  memory_save: { scope: 'external_api', capability: 'memory', externalApi: 'supabase' },
  memory_retrieve: { scope: 'external_api', capability: 'memory', externalApi: 'supabase' },
  memory_delete: { scope: 'external_api', capability: 'memory', externalApi: 'supabase' },
  data_analyze: { scope: 'shell', capability: 'data_analysis' },
  data_visualize: { scope: 'shell', capability: 'data_analysis' },
};

const serializeForSignature = (manifest: SkillManifest): string => {
  const copy = { ...manifest, signature: undefined };
  return JSON.stringify(copy);
};

const simpleHash = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `sig-${Math.abs(hash)}`;
};

const verifySignature = (manifest: SkillManifest): boolean => {
  if (manifest.provenance === 'core') return true;
  if (!manifest.signature?.value) return false;
  return simpleHash(serializeForSignature(manifest)) === manifest.signature.value;
};

export const validateSkillManifest = (manifest: SkillManifest): boolean => {
  return Boolean(
    manifest.name &&
    manifest.version &&
    Array.isArray(manifest.capabilities) &&
    Array.isArray(manifest.required_tools) &&
    Array.isArray(manifest.prompts) &&
    manifest.policies
  );
};

export const loadSkillManifests = (): SkillManifest[] => {
  const manifests = Object.values(skillModules)
    .map((mod) => (mod as SkillModule).default)
    .filter(validateSkillManifest)
    .filter((manifest) => verifySignature(manifest));

  return manifests;
};

export const resolveCapabilityConflicts = (
  enabledSkills: SkillManifest[],
  selectedByCapability: Record<string, string>
): Record<string, string> => {
  const capabilityAssignments: Record<string, string> = {};
  const capabilityMap = new Map<string, SkillManifest[]>();

  enabledSkills.forEach((skill) => {
    skill.capabilities.forEach((capability) => {
      const list = capabilityMap.get(capability) || [];
      list.push(skill);
      capabilityMap.set(capability, list);
    });
  });

  capabilityMap.forEach((skills, capability) => {
    const selected = selectedByCapability[capability];
    if (selected && skills.some((skill) => skill.name === selected)) {
      capabilityAssignments[capability] = selected;
      return;
    }
    capabilityAssignments[capability] = skills[0].name;
  });

  return capabilityAssignments;
};

export const getSkillRuntimeContext = (): SkillRuntimeContext => {
  const manifests = loadSkillManifests();
  const savedEnabled = JSON.parse(localStorage.getItem(SKILL_ENABLED_STORAGE_KEY) || '{}') as Record<string, boolean>;
  const savedConflicts = JSON.parse(localStorage.getItem(SKILL_CONFLICT_STORAGE_KEY) || '{}') as Record<string, string>;

  const enabledSkills = manifests.filter((skill) => savedEnabled[skill.name] ?? skill.enabled_by_default);
  const capabilityAssignments = resolveCapabilityConflicts(enabledSkills, savedConflicts);

  return {
    manifests,
    enabledSkills,
    capabilityAssignments,
    selectedByCapability: savedConflicts,
  };
};

export const persistSkillSettings = (enabled: Record<string, boolean>, conflicts: Record<string, string>) => {
  localStorage.setItem(SKILL_ENABLED_STORAGE_KEY, JSON.stringify(enabled));
  localStorage.setItem(SKILL_CONFLICT_STORAGE_KEY, JSON.stringify(conflicts));
};

export const enforceSkillPermissions = (
  runtimeContext: SkillRuntimeContext,
  toolName: string
): { allowed: boolean; reason?: string } => {
  const policy = TOOL_SCOPE_MAP[toolName];
  if (!policy) return { allowed: true };

  const assignedSkillName = runtimeContext.capabilityAssignments[policy.capability];
  const candidateSkills = assignedSkillName
    ? runtimeContext.enabledSkills.filter((skill) => skill.name === assignedSkillName)
    : runtimeContext.enabledSkills.filter(
        (skill) => skill.required_tools.includes(toolName) || skill.capabilities.includes(policy.capability)
      );

  if (candidateSkills.length === 0) return { allowed: true };

  const selectedSkill = candidateSkills[0];
  const permissions = selectedSkill.policies.permissions;

  if (!permissions[policy.scope]) {
    return { allowed: false, reason: `Skill "${selectedSkill.name}" blocks ${policy.scope} access.` };
  }

  if (policy.externalApi && !permissions.external_apis.includes(policy.externalApi)) {
    return { allowed: false, reason: `Skill "${selectedSkill.name}" does not allow API: ${policy.externalApi}.` };
  }

  return { allowed: true };
};
