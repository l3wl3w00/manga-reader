import { fitCaption, fits, folioWidth, keyHintsWidth } from './gutter-fit';

describe('gutter fitting', () => {
  const full = 'Crimson Tide Ronin · CH 214 · 07 / 19', short = 'CH 214 · 07 / 19';

  // Regression: at 1024x700 the hints and the caption ran onto the page (gutter about 267px).
  it('drops the title from the caption when the gutter is narrow, keeps it when wide', () => {
    expect(fitCaption(267, full, short)).toBe(short);
    expect(fitCaption(419, full, short)).toBe(full);
    expect(fitCaption(100, full, short)).toBeNull();
  });

  it('hides the key hints in a narrow gutter and shows them in a wide one', () => {
    const w = keyHintsWidth('Tab', 'Ctrl');
    expect(fits(w, 267)).toBe(false);
    expect(fits(w, 419)).toBe(true);
  });

  it('measures mono text by its advance', () => {
    expect(folioWidth('0123456789')).toBeCloseTo(81.4);
  });
});
