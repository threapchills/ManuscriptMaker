import { describe, expect, it } from 'vitest';
import { ASSETS } from '../src/assets';
import { assetLayer } from '../src/document';
import { campaignAssets, newCampaignProject } from '../src/campaign';
import { startGame, stepGame } from '../src/game';
import { validateProject } from '../src/project';

describe('campaign practice pages', () => {
  const sprite = '/ManuscriptMaker/assets/hare.png';

  it('keeps two distinct editable level pages and curated early asset trays', () => {
    const project = newCampaignProject(sprite);
    expect(() => validateProject(project)).not.toThrow();
    expect(project.pages).toHaveLength(2);
    expect(project.pages[0].id).not.toBe(project.pages[1].id);
    for (const page of project.pages) {
      expect(page.layers.filter(layer => layer.type === 'image' && layer.gameRole === 'player')).toHaveLength(1);
      expect(page.layers.filter(layer => layer.type === 'image' && layer.gameRole === 'goal')).toHaveLength(1);
    }
    expect(campaignAssets(0)).toContain('bridge-wooden');
    expect(campaignAssets(0)).not.toContain('cottage-stone');
    expect(campaignAssets(1)).toContain('cottage-stone');
  });

  it('accepts a built route when the player actually reaches the checkpoint', () => {
    const page = newCampaignProject(sprite).pages[0];
    const meadow = assetLayer(ASSETS.find(item => item.id === 'meadow-short')!);
    Object.assign(meadow, { x: 430, y: 590, width: 170, height: 130 });
    const bridge = assetLayer(ASSETS.find(item => item.id === 'bridge-wooden')!);
    Object.assign(bridge, { x: 595, y: 590, width: 245 });
    const built = { ...page, layers: [...page.layers, meadow, bridge] };
    let state = startGame(built)!;
    for (let frame = 0; frame < 420 && !state.won; frame++) state = stepGame(built, state, { left: false, right: true, jump: false }, 1 / 60);
    expect(state.won).toBe(true);
    expect(state.falls).toBe(0);
  });
});
