/**
 * API Client for Video Replicator
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const API_PREFIX = '/api/v1';

export interface SceneAnalysis {
  scene_number?: number;
  timestamp_start?: string;
  timestamp_end?: string;
  duration_seconds?: number;
  scene_type?: string;
  subject_description?: {
    type?: string;
    what_is_it?: string;
    design_style?: string;
    physical_appearance?: string;
    distinctive_features?: string;
    colors?: string;
    expression?: string;
    pose_action?: string;
    energy_level?: string;
    voice_character?: string;
  };
  visual_composition?: {
    shot_type?: string;
    camera_angle?: string;
    camera_position?: string;
    camera_movement?: string;
    framing?: string;
  };
  subject_in_frame?: {
    position_in_frame?: string;
    size_percentage?: string;
    action?: string;
    gesture?: string;
    facial_expression?: string;
    eye_direction?: string;
  };
  background?: {
    description?: string;
    blur_level?: string;
    visible_elements?: string[];
    lighting?: string;
    environment_style?: string;
  };
  motion_dynamics?: {
    movement_speed?: string;
    transition_in?: string;
    transition_out?: string;
    energy_level?: string;
  };
  text_graphics?: {
    text_overlay?: string;
    text_position?: string;
    text_animation?: string;
    graphics?: string;
  };
  audio?: {
    dialogue?: string;
    music_mood?: string;
    sound_effects?: string;
  };
  recreation_notes?: string;
}

export interface VideoAnalysis {
  video_type?: {
    primary_type: string;
    sub_type?: string;
    description?: string;
  };
  transcript?: string;
  style_analysis?: {
    visual_style?: string;
    color_palette?: string;
    lighting?: string;
    camera_work?: string;
    pacing?: string;
    mood?: string;
    character_description?: string;
    environment_description?: string;
  };
  content_analysis?: {
    hook_type?: string;
    structure?: string;
    target_audience?: string;
  };
  scene_breakdown?: SceneAnalysis[];
}

export interface AnalyzeVideoUrlResponse {
  success: boolean;
  error?: string;
  analysis?: VideoAnalysis;
}

export interface GenerateScenePromptResponse {
  prompt: string;
  scene_number: number;
  duration_seconds: number;
}

export interface PromptResult {
  scene_number: number;
  prompt: string;
  duration_seconds: number;
  success: boolean;
  error?: string;
}

export interface GenerateAllPromptsResponse {
  prompts: PromptResult[];
  total_scenes: number;
  successful_count: number;
  failed_count: number;
}

export interface TranslateScriptResponse {
  translated_text: string;
  source_language: string;
  target_language: string;
}

export interface TranslationResult {
  index: number;
  original: string;
  translated: string;
  source_language: string;
  target_language: string;
  success: boolean;
  error?: string;
}

export interface TranslateAllResponse {
  translations: TranslationResult[];
  total_count: number;
  successful_count: number;
  failed_count: number;
}

// Script-to-Video types
export interface StoryboardScene {
  scene_number: number;
  duration: string;
  dialogue: string;
  visual_description: string;
  camera: string;
  mood: string;
}

export interface StoryboardConcept {
  id: string;
  style_name: string;
  style_icon: string;
  creative_concept: string;
  visual_approach: string;
  character_description?: string;
  environment_description?: string;
  mood_and_tone: string;
  scenes: StoryboardScene[];
}

export interface GenerateStoryboardsResponse {
  concepts: StoryboardConcept[];
}

export interface ReplicationPrompt {
  scene_number: number;
  dialogue: string;
  prompt: string;
  duration_seconds: number;
  scene_analysis?: any;
}

export interface GenerateReplicationPromptsResponse {
  prompts: ReplicationPrompt[];
  total_scenes: number;
  style_summary?: string;
}

export interface StoryboardPromptResult {
  scene_number: number;
  prompt: string;
  duration_seconds: number;
  success: boolean;
  error?: string;
}

export interface GeneratePromptsFromStoryboardResponse {
  prompts: StoryboardPromptResult[];
  total_scenes: number;
  successful_count: number;
  failed_count: number;
}

export const api = {
  // Analyze video URL
  analyzeVideoUrl: async (data: {
    video_url: string;
    model?: string;
    extract_transcript?: boolean;
    analyze_style?: boolean;
    target_scene_count?: number | null;
    merge_short_scenes?: boolean;
    skip_scene_breakdown?: boolean;
  }): Promise<AnalyzeVideoUrlResponse> => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/analyze-video-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to analyze video');
    return response.json();
  },

  // Generate single scene prompt
  generateScenePrompt: async (data: {
    scene_analysis: any;
    dialogue: string;
    video_style?: any;
    video_type?: any;
    model?: string;
    aspect_ratio?: string;
    include_music?: boolean;
    include_text_overlays?: boolean;
    include_sound_effects?: boolean;
    prompt_detail_level?: 'basic' | 'detailed' | 'ultra_detailed';
    max_duration_seconds?: number;
  }): Promise<GenerateScenePromptResponse> => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/generate-scene-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scene_analysis: data.scene_analysis,
        dialogue: data.dialogue,
        video_style: data.video_style,
        video_type: data.video_type,
        model: data.model || 'gemini-2.5-flash',
        aspect_ratio: data.aspect_ratio || 'VIDEO_ASPECT_RATIO_PORTRAIT',
        include_music: data.include_music ?? true,
        include_text_overlays: data.include_text_overlays ?? true,
        include_sound_effects: data.include_sound_effects ?? true,
        prompt_detail_level: data.prompt_detail_level || 'ultra_detailed',
        max_duration_seconds: data.max_duration_seconds || 8,
      }),
    });
    if (!response.ok) throw new Error('Failed to generate scene prompt');
    return response.json();
  },

  // Generate all prompts (bulk)
  generateAllPrompts: async (data: {
    scenes: Array<{ scene_analysis: any; dialogue: string }>;
    video_style?: any;
    video_type?: any;
    model?: string;
    aspect_ratio?: string;
    include_music?: boolean;
    include_text_overlays?: boolean;
    include_sound_effects?: boolean;
    prompt_detail_level?: 'basic' | 'detailed' | 'ultra_detailed';
    max_duration_seconds?: number;
  }): Promise<GenerateAllPromptsResponse> => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/generate-all-prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenes: data.scenes,
        video_style: data.video_style,
        video_type: data.video_type,
        model: data.model || 'gemini-2.5-flash',
        aspect_ratio: data.aspect_ratio || 'VIDEO_ASPECT_RATIO_PORTRAIT',
        include_music: data.include_music ?? true,
        include_text_overlays: data.include_text_overlays ?? true,
        include_sound_effects: data.include_sound_effects ?? true,
        prompt_detail_level: data.prompt_detail_level || 'ultra_detailed',
        max_duration_seconds: data.max_duration_seconds || 8,
      }),
    });
    if (!response.ok) throw new Error('Failed to generate all prompts');
    return response.json();
  },

  // Translate single text
  translateScript: async (data: {
    text: string;
    model?: string;
    include_diacritics?: boolean;
  }): Promise<TranslateScriptResponse> => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/translate-script`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to translate script');
    return response.json();
  },

  // Translate all dialogues (bulk)
  translateAllDialogues: async (data: {
    dialogues: string[];
    model?: string;
    include_diacritics?: boolean;
  }): Promise<TranslateAllResponse> => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/translate-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dialogues: data.dialogues,
        model: data.model || 'gemini-2.5-flash',
        include_diacritics: data.include_diacritics ?? true,
      }),
    });
    if (!response.ok) throw new Error('Failed to translate all dialogues');
    return response.json();
  },

  // ============================================================================
  // Script-to-Video API Methods
  // ============================================================================

  // Generate storyboard concepts from script
  generateStoryboards: async (data: {
    script: string;
    model?: string;
    aspect_ratio?: string;
    num_concepts?: number;
    style_reference_url?: string;
    video_analysis?: any;
    replication_mode?: boolean;
  }): Promise<GenerateStoryboardsResponse> => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/generate-storyboards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: data.script,
        model: data.model || 'gemini-2.5-flash',
        aspect_ratio: data.aspect_ratio || 'VIDEO_ASPECT_RATIO_PORTRAIT',
        num_concepts: data.num_concepts || 3,
        style_reference_url: data.style_reference_url,
        video_analysis: data.video_analysis,
        replication_mode: data.replication_mode || false,
      }),
    });
    if (!response.ok) throw new Error('Failed to generate storyboards');
    return response.json();
  },

  // Generate replication prompts (exact copy mode)
  generateReplicationPrompts: async (data: {
    script: string;
    video_analysis: any;
    model?: string;
    aspect_ratio?: string;
  }): Promise<GenerateReplicationPromptsResponse> => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/generate-replication-prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: data.script,
        video_analysis: data.video_analysis,
        model: data.model || 'gemini-2.5-flash',
        aspect_ratio: data.aspect_ratio || 'VIDEO_ASPECT_RATIO_PORTRAIT',
      }),
    });
    if (!response.ok) throw new Error('Failed to generate replication prompts');
    return response.json();
  },

  // Generate prompts from a storyboard
  generatePromptsFromStoryboard: async (data: {
    script: string;
    storyboard: StoryboardConcept;
    model?: string;
    aspect_ratio?: string;
  }): Promise<GeneratePromptsFromStoryboardResponse> => {
    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/generate-prompts-from-storyboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        script: data.script,
        storyboard: data.storyboard,
        model: data.model || 'gemini-2.5-flash',
        aspect_ratio: data.aspect_ratio || 'VIDEO_ASPECT_RATIO_PORTRAIT',
      }),
    });
    if (!response.ok) throw new Error('Failed to generate prompts from storyboard');
    return response.json();
  },
};
