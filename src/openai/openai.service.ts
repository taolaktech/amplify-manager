import { Injectable, InternalServerErrorException } from '@nestjs/common';
import OpenAI from 'openai';
import { AppConfigService } from 'src/config/config.service';

export interface GenerateVideoScriptParams {
  productName: string;
  productDescription: string;
  productImages?: string[];
  presetLabel?: string;
  presetDuration?: number;
  presetResolution?: string;
}

export interface GenerateImageAdCopyParams {
  productName: string;
  productDescription: string;
  productImages?: string[];
  presetLabel?: string;
  presetResolution?: string;
}

export interface ImageAdCopy {
  headline: string;
  description: string;
  cta: string;
}

@Injectable()
export class OpenAIService {
  private readonly client: OpenAI;

  constructor(private readonly config: AppConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get('OPENAI_API_KEY') as string,
    });
  }

  async generateVideoScript(
    params: GenerateVideoScriptParams,
  ): Promise<string> {
    const {
      productName,
      productDescription,
      presetLabel,
      presetDuration,
      presetResolution,
    } = params;

    const durationHint = presetDuration
      ? `Target duration: ${presetDuration} seconds.`
      : '';
    const resolutionHint = presetResolution
      ? `Video resolution: ${presetResolution}.`
      : '';
    const presetHint = presetLabel
      ? `The video style/template is described as: "${presetLabel}".`
      : '';

    const prompt = [
      `Write a short, punchy ad video script for the following product.`,
      `Product name: ${productName}`,
      `Product description: ${productDescription}`,
      presetHint,
      durationHint,
      resolutionHint,
      ``,
      `The script must include a hook, a brief problem/solution, and a call-to-action.`,
      `Format it as a simple narration script with scene labels (Hook, Problem, Solution, CTA).`,
      `Do not include any explanation or commentary — only the script itself.`,
    ]
      .filter(Boolean)
      .join('\n');

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional ad copywriter specialising in short-form video scripts for e-commerce brands.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 500,
    });

    const script = completion.choices[0]?.message?.content?.trim();
    if (!script) {
      throw new InternalServerErrorException(
        'OpenAI returned an empty video script.',
      );
    }
    return script;
  }

  async generateImageAdCopy(
    params: GenerateImageAdCopyParams,
  ): Promise<ImageAdCopy> {
    const { productName, productDescription, presetLabel, presetResolution } =
      params;

    const presetHint = presetLabel
      ? `The image ad style/template is described as: "${presetLabel}".`
      : '';
    const resolutionHint = presetResolution
      ? `Image format/resolution: ${presetResolution}.`
      : '';

    const prompt = [
      `Write concise ad copy for an image advertisement for the following product.`,
      `Product name: ${productName}`,
      `Product description: ${productDescription}`,
      presetHint,
      resolutionHint,
      ``,
      `Return a JSON object with exactly these three keys:`,
      `  "headline"    – a short, attention-grabbing headline (max 10 words)`,
      `  "description" – a one-sentence supporting description (max 20 words)`,
      `  "cta"         – a short call-to-action button text (max 5 words)`,
      ``,
      `Respond with valid JSON only. No markdown fences, no explanation.`,
    ]
      .filter(Boolean)
      .join('\n');

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional ad copywriter specialising in image advertisements for e-commerce brands. You respond only with valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      throw new InternalServerErrorException(
        'OpenAI returned an empty image ad copy response.',
      );
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new InternalServerErrorException(
        'OpenAI returned invalid JSON for image ad copy.',
      );
    }

    const headline = typeof parsed.headline === 'string' ? parsed.headline : '';
    const description =
      typeof parsed.description === 'string' ? parsed.description : '';
    const cta = typeof parsed.cta === 'string' ? parsed.cta : '';

    if (!headline || !description || !cta) {
      throw new InternalServerErrorException(
        'OpenAI response is missing required image ad copy fields.',
      );
    }

    return { headline, description, cta };
  }
}
