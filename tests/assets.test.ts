import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ASSETS } from '../src/assets';
import { assetLayer, newManuscript, validateManuscript } from '../src/document';
import { sceneConfig } from '../src/sceneCatalog';

describe('published artwork catalog', () => {
  it('has unique stable ids and real PNG files for every library entry', () => {
    expect(new Set(ASSETS.map(asset => asset.id)).size).toBe(ASSETS.length);
    for (const asset of ASSETS) {
      expect(asset.src).toBe(`/ManuscriptMaker/assets/${asset.id}.png`);
      const png = readFileSync(resolve('public/assets', `${asset.id}.png`));
      expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(png.readUInt32BE(16) / png.readUInt32BE(20)).toBeCloseTo(asset.width / asset.height, 5);
      if (asset.kind === 'part') {
        expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([asset.width, asset.height]);
        expect(png[25]).toBe(6); // RGBA; alpha content is checked by the sheet slicer.
      }
    }
  });

  it('places modular parts and scene pieces at useful sizes while preserving their proportions', () => {
    for (const asset of ASSETS.filter(item => item.kind === 'part')) {
      const layer = assetLayer(asset);
      expect(layer.width).toBeLessThanOrEqual(sceneConfig(asset.id)?.width ?? 125.001);
      if (!sceneConfig(asset.id)) expect(Math.max(layer.width, layer.height)).toBeLessThanOrEqual(125.001);
      expect(layer.width / layer.height).toBeCloseTo(asset.width / asset.height, 5);
      expect(() => validateManuscript({ ...newManuscript('blank'), layers: [layer] })).not.toThrow();
    }
  });

  it('keeps every template image in the catalog', () => {
    for (const name of ['bestiary', 'botanical']) {
      for (const layer of newManuscript(name).layers) {
        if (layer.type === 'image') expect(ASSETS.some(asset => asset.id === layer.assetId && asset.src === layer.src)).toBe(true);
      }
    }
  });
});
