import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';
import { CanvasDocumentService } from './core/canvas-document.service';
import { EditorStateService } from './core/editor-state.service';
import { DEFAULT_TEXT_FONT_FAMILY, TRANSPARENT_COLOR } from './models/tool.model';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders File, Edit, and View menus, all 6 tools, canvas, and 1280x1024 status', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    const menuButtons = Array.from(compiled.querySelectorAll('.menu-trigger')).map((el) =>
      el.textContent?.trim(),
    );
    expect(menuButtons).toEqual(['File', 'Edit', 'View']);

    const toolButtons = Array.from(compiled.querySelectorAll('.tool-btn')).map((el) =>
      el.getAttribute('aria-label'),
    );
    expect(toolButtons).toEqual(['Pencil', 'Fill', 'Eraser', 'Text', 'Line', 'Shapes']);

    const canvas = compiled.querySelector('canvas');
    expect(canvas).toBeTruthy();

    expect(compiled.querySelector('.status-bar')?.textContent).toContain('1280 × 1024 px');
  });

  it('updates dynamic tool options for Fill (empty) and Text (font & style controls)', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const fillBtn = compiled.querySelector('button[aria-label="Fill"]') as HTMLButtonElement;
    fillBtn.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.options-group .group-label')?.textContent?.trim()).toBe(
      'Fill Options',
    );
    expect(compiled.querySelector('.options-empty')?.textContent?.trim()).toBe('No options yet');

    const textBtn = compiled.querySelector('button[aria-label="Text"]') as HTMLButtonElement;
    textBtn.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.options-group .group-label')?.textContent?.trim()).toBe(
      'Text Options',
    );
    expect(compiled.querySelector('.options-empty')).toBeNull();
    expect(compiled.querySelector('select[aria-label="Font family"]')).toBeTruthy();
    expect(compiled.querySelector('input[aria-label="Font size in pixels"]')).toBeTruthy();
    expect(compiled.querySelector('button[aria-label="Font size presets"]')).toBeTruthy();
    expect(compiled.querySelector('button[aria-label="Bold"]')).toBeTruthy();
    expect(compiled.querySelector('button[aria-label="Italic"]')).toBeTruthy();
    expect(compiled.querySelector('button[aria-label="Underline"]')).toBeTruthy();
  });

  it('updates text option defaults, syncs active text box live, and supports B/I/U shortcuts', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const editorState = TestBed.inject(EditorStateService);

    const textBtn = compiled.querySelector('button[aria-label="Text"]') as HTMLButtonElement;
    textBtn.click();
    fixture.detectChanges();

    const fontSelect = compiled.querySelector('select[aria-label="Font family"]') as HTMLSelectElement;
    const fontSizeInput = compiled.querySelector(
      'input[aria-label="Font size in pixels"]',
    ) as HTMLInputElement;
    const presetsBtn = compiled.querySelector(
      'button[aria-label="Font size presets"]',
    ) as HTMLButtonElement;
    const boldBtn = compiled.querySelector('button[aria-label="Bold"]') as HTMLButtonElement;
    const italicBtn = compiled.querySelector('button[aria-label="Italic"]') as HTMLButtonElement;
    const underlineBtn = compiled.querySelector(
      'button[aria-label="Underline"]',
    ) as HTMLButtonElement;

    expect(fontSelect.value).toBe(DEFAULT_TEXT_FONT_FAMILY);
    expect(fontSizeInput.value).toBe('24');
    expect(boldBtn.getAttribute('aria-pressed')).toBe('false');
    expect(italicBtn.getAttribute('aria-pressed')).toBe('false');
    expect(underlineBtn.getAttribute('aria-pressed')).toBe('false');

    // Change defaults before opening a text box
    fontSelect.value = 'Georgia, serif';
    fontSelect.dispatchEvent(new Event('change'));
    presetsBtn.click();
    fixture.detectChanges();

    const preset36 = Array.from(compiled.querySelectorAll('.font-size-option')).find(
      (btn) => btn.textContent?.trim() === '36',
    ) as HTMLButtonElement;
    expect(preset36).toBeTruthy();
    preset36.click();
    boldBtn.click();
    fixture.detectChanges();

    expect(editorState.textFontFamily()).toBe('Georgia, serif');
    expect(editorState.textFontSize()).toBe(36);
    expect(editorState.textBold()).toBe(true);
    expect(compiled.querySelector('.font-size-menu')).toBeNull();

    // Open an active text draft with the current defaults
    editorState.activeTextDraft.set({
      rect: { x: 20, y: 30, width: 240, height: 80 },
      text: 'Hello World',
      fontFamily: editorState.textFontFamily(),
      fontSize: editorState.textFontSize(),
      bold: editorState.textBold(),
      italic: editorState.textItalic(),
      underline: editorState.textUnderline(),
      color: editorState.foregroundColor(),
    });
    fixture.detectChanges();

    const textarea = compiled.querySelector('.text-input') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.style.fontFamily).toContain('Georgia');
    expect(textarea.style.fontSize).toBe('36px');
    expect(textarea.style.fontWeight).toBe('bold');
    expect(textarea.style.fontStyle).toBe('normal');
    expect(textarea.style.textDecoration).toBe('none');

    // Changing toolbar options updates both defaults and the active text overlay live
    fontSelect.value = 'Consolas, monospace';
    fontSelect.dispatchEvent(new Event('change'));
    fontSizeInput.value = '48';
    fontSizeInput.dispatchEvent(new Event('input'));
    italicBtn.click();
    underlineBtn.click();
    fixture.detectChanges();

    expect(editorState.textFontFamily()).toBe('Consolas, monospace');
    expect(editorState.textFontSize()).toBe(48);
    expect(editorState.textItalic()).toBe(true);
    expect(editorState.textUnderline()).toBe(true);
    expect(editorState.activeTextDraft()).toMatchObject({
      fontFamily: 'Consolas, monospace',
      fontSize: 48,
      bold: true,
      italic: true,
      underline: true,
    });
    expect(textarea.style.fontFamily).toContain('Consolas');
    expect(textarea.style.fontSize).toBe('48px');
    expect(textarea.style.fontWeight).toBe('bold');
    expect(textarea.style.fontStyle).toBe('italic');
    expect(textarea.style.textDecoration).toContain('underline');

    // Keyboard shortcuts Ctrl+B, Ctrl+I, Ctrl+U inside textarea toggle styles on draft and defaults
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', ctrlKey: true, bubbles: true }));
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'u', ctrlKey: true, bubbles: true }));
    fixture.detectChanges();

    expect(editorState.textBold()).toBe(false);
    expect(editorState.textItalic()).toBe(false);
    expect(editorState.textUnderline()).toBe(false);
    expect(editorState.activeTextDraft()).toMatchObject({
      bold: false,
      italic: false,
      underline: false,
    });
    expect(textarea.style.fontWeight).toBe('normal');
    expect(textarea.style.fontStyle).toBe('normal');
    expect(textarea.style.textDecoration).toBe('none');
  });

  it('renders independent size slider and number input for Pencil (8px) and Eraser (10px)', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const editorState = TestBed.inject(EditorStateService);

    const slider = compiled.querySelector('.size-slider') as HTMLInputElement;
    const numberInput = compiled.querySelector('.size-number-input') as HTMLInputElement;
    expect(slider.value).toBe('8');
    expect(numberInput.value).toBe('8');

    const sizeOption = compiled.querySelector('.size-option') as HTMLElement;
    expect(sizeOption.firstElementChild?.classList.contains('size-slider')).toBe(true);
    expect(sizeOption.children[1]?.classList.contains('size-row')).toBe(true);
    expect(sizeOption.children[1]?.querySelector('.size-number-input')).toBeTruthy();

    numberInput.value = '18';
    numberInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(editorState.pencilSize()).toBe(18);
    expect(slider.value).toBe('18');

    const eraserBtn = compiled.querySelector('button[aria-label="Eraser"]') as HTMLButtonElement;
    eraserBtn.click();
    fixture.detectChanges();

    const eraserSlider = compiled.querySelector('.size-slider') as HTMLInputElement;
    const eraserInput = compiled.querySelector('.size-number-input') as HTMLInputElement;
    expect(eraserSlider.value).toBe('10');
    expect(eraserInput.value).toBe('10');

    eraserSlider.value = '32';
    eraserSlider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(editorState.eraserSize()).toBe(32);
    expect(editorState.pencilSize()).toBe(18);
    expect(eraserInput.value).toBe('32');
  });

  it('renders circular brush cursor preview at exact pixel bounds for Pencil and Eraser only', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const editorState = TestBed.inject(EditorStateService);

    expect(compiled.querySelector('.brush-cursor')).toBeNull();

    editorState.cursorPos.set({ x: 100, y: 50 });
    fixture.detectChanges();

    let cursorEl = compiled.querySelector('.brush-cursor') as HTMLElement;
    expect(cursorEl).toBeTruthy();
    expect(cursorEl.style.left).toBe('96px');
    expect(cursorEl.style.top).toBe('46px');
    expect(cursorEl.style.width).toBe('8px');
    expect(cursorEl.style.height).toBe('8px');

    const eraserBtn = compiled.querySelector('button[aria-label="Eraser"]') as HTMLButtonElement;
    eraserBtn.click();
    fixture.detectChanges();

    cursorEl = compiled.querySelector('.brush-cursor') as HTMLElement;
    expect(cursorEl).toBeTruthy();
    expect(cursorEl.style.left).toBe('95px');
    expect(cursorEl.style.top).toBe('45px');
    expect(cursorEl.style.width).toBe('10px');
    expect(cursorEl.style.height).toBe('10px');

    const fillBtn = compiled.querySelector('button[aria-label="Fill"]') as HTMLButtonElement;
    fillBtn.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.brush-cursor')).toBeNull();

    const textBtn = compiled.querySelector('button[aria-label="Text"]') as HTMLButtonElement;
    textBtn.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.brush-cursor')).toBeNull();

    const lineBtn = compiled.querySelector('button[aria-label="Line"]') as HTMLButtonElement;
    lineBtn.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.brush-cursor')).toBeNull();

    const shapesBtn = compiled.querySelector('button[aria-label="Shapes"]') as HTMLButtonElement;
    shapesBtn.click();
    fixture.detectChanges();
    expect(compiled.querySelector('.brush-cursor')).toBeNull();
  });

  it('supports Line tool options, thickness default (8px), independent Start/End caps, and L shortcut', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const editorState = TestBed.inject(EditorStateService);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l' }));
    fixture.detectChanges();

    expect(editorState.activeTool()).toBe('line');
    expect(compiled.querySelector('.options-group .group-label')?.textContent?.trim()).toBe(
      'Line Options',
    );

    const thicknessOption = compiled.querySelector('.thickness-option') as HTMLElement;
    expect(thicknessOption.firstElementChild?.classList.contains('size-slider')).toBe(true);
    expect(thicknessOption.children[1]?.classList.contains('size-row')).toBe(true);
    expect(thicknessOption.children[1]?.querySelector('.size-number-input')).toBeTruthy();

    const thicknessInput = compiled.querySelector(
      'input[aria-label="Line thickness in pixels"]',
    ) as HTMLInputElement;
    expect(thicknessInput.value).toBe('8');

    const startSlotBtn = compiled.querySelector('button[aria-label="Start cap"]') as HTMLButtonElement;
    const endSlotBtn = compiled.querySelector('button[aria-label="End cap"]') as HTMLButtonElement;
    expect(startSlotBtn.classList.contains('active')).toBe(false);
    expect(endSlotBtn.classList.contains('active')).toBe(true);

    const capBtns = compiled.querySelectorAll('.cap-btn');
    expect(capBtns.length).toBe(10);

    const roundBtn = compiled.querySelector('button[aria-label="Round"]') as HTMLButtonElement;
    expect(roundBtn.classList.contains('active')).toBe(true);

    thicknessInput.value = '14';
    thicknessInput.dispatchEvent(new Event('input'));
    const arrowBtn = compiled.querySelector('button[aria-label="Arrow"]') as HTMLButtonElement;
    arrowBtn.click();
    fixture.detectChanges();

    expect(editorState.lineWidth()).toBe(14);
    expect(editorState.lineEndCap()).toBe('arrow');
    expect(arrowBtn.classList.contains('active')).toBe(true);

    startSlotBtn.click();
    fixture.detectChanges();
    expect(startSlotBtn.classList.contains('active')).toBe(true);
    expect(endSlotBtn.classList.contains('active')).toBe(false);
    expect(roundBtn.classList.contains('active')).toBe(true);

    const circleBtn = compiled.querySelector('button[aria-label="Circle"]') as HTMLButtonElement;
    circleBtn.click();
    fixture.detectChanges();
    expect(editorState.lineStartCap()).toBe('circle');
    expect(editorState.lineEndCap()).toBe('arrow');
    expect(circleBtn.classList.contains('active')).toBe(true);
  });

  it('supports Shapes tool options, separate Outline/Fill colors, transparent outline, and staged overlay', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const editorState = TestBed.inject(EditorStateService);
    const canvasDoc = TestBed.inject(CanvasDocumentService);
    const commitSpy = vi.spyOn(canvasDoc, 'commitActiveEdit');
    const cancelSpy = vi.spyOn(canvasDoc, 'cancelActiveEdit');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }));
    fixture.detectChanges();

    expect(editorState.activeTool()).toBe('shapes');
    expect(compiled.querySelector('.options-group .group-label')?.textContent?.trim()).toBe(
      'Shapes Options',
    );
    expect(compiled.querySelector('.colors-group .group-label')?.textContent?.trim()).toBe(
      'Outline Color',
    );

    const outlineOption = compiled.querySelector('.outline-option') as HTMLElement;
    expect(outlineOption.firstElementChild?.classList.contains('size-slider')).toBe(true);
    expect(outlineOption.children[1]?.classList.contains('size-row')).toBe(true);
    expect(outlineOption.children[1]?.querySelector('.size-number-input')).toBeTruthy();

    const outlineInput = compiled.querySelector(
      'input[aria-label="Outline width in pixels"]',
    ) as HTMLInputElement;
    expect(outlineInput.value).toBe('8');
    expect(compiled.querySelectorAll('.shape-btn').length).toBe(10);

    const slotButtons = Array.from(compiled.querySelectorAll('.color-slot-btn')) as HTMLButtonElement[];
    expect(slotButtons).toHaveLength(2);
    expect(slotButtons[0].classList.contains('active')).toBe(true);
    expect(editorState.shapeOutlineColor()).toBe('#000000');
    expect(editorState.shapeFillColor()).toBe(TRANSPARENT_COLOR);

    // Stage a shape draft
    editorState.activeShapeDraft.set({
      rect: { x: 40, y: 50, width: 140, height: 140 },
      shapeType: editorState.shapeType(),
      outlineWidth: editorState.shapeOutlineWidth(),
      outlineColor: editorState.shapeOutlineColor(),
      fillColor: editorState.shapeFillColor(),
    });
    fixture.detectChanges();

    expect(compiled.querySelector('app-shape-overlay')).toBeTruthy();

    // Update shape type, outline width, and switch outline to transparent & fill to red
    const starBtn = compiled.querySelector('button[aria-label="Star"]') as HTMLButtonElement;
    starBtn.click();
    outlineInput.value = '12';
    outlineInput.dispatchEvent(new Event('input'));
    const transparentBtn = compiled.querySelector('.transparent-btn') as HTMLButtonElement;
    transparentBtn.click();
    slotButtons[1].click();
    fixture.detectChanges();

    expect(compiled.querySelector('.colors-group .group-label')?.textContent?.trim()).toBe(
      'Fill Color',
    );

    const redBtn = compiled.querySelector(
      '.colors-group button[aria-label="Select color #ed1c24"]',
    ) as HTMLButtonElement;
    redBtn.click();
    fixture.detectChanges();

    expect(editorState.activeShapeDraft()).toMatchObject({
      shapeType: 'star',
      outlineWidth: 12,
      outlineColor: TRANSPARENT_COLOR,
      fillColor: '#ed1c24',
    });

    // Apply via overlay Apply button
    const applyBtn = compiled.querySelector('app-shape-overlay .apply-btn') as HTMLButtonElement;
    applyBtn.click();
    fixture.detectChanges();
    expect(commitSpy).toHaveBeenCalledTimes(1);
    expect(editorState.activeShapeDraft()).toBeNull();

    // Stage again and verify Escape cancels and Enter commits
    editorState.activeShapeDraft.set({
      rect: { x: 40, y: 50, width: 140, height: 140 },
      shapeType: 'heart',
      outlineWidth: 8,
      outlineColor: '#000000',
      fillColor: TRANSPARENT_COLOR,
    });
    fixture.detectChanges();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
    expect(editorState.activeShapeDraft()).toBeNull();

    editorState.activeShapeDraft.set({
      rect: { x: 40, y: 50, width: 140, height: 140 },
      shapeType: 'plus',
      outlineWidth: 8,
      outlineColor: '#000000',
      fillColor: TRANSPARENT_COLOR,
    });
    fixture.detectChanges();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(commitSpy).toHaveBeenCalledTimes(2);
    expect(editorState.activeShapeDraft()).toBeNull();
  });

  it('supports Instant checkbox on Shapes tool and commits active draft when enabled', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const editorState = TestBed.inject(EditorStateService);
    const canvasDoc = TestBed.inject(CanvasDocumentService);
    const commitSpy = vi.spyOn(canvasDoc, 'commitActiveEdit');

    const shapesBtn = compiled.querySelector('button[aria-label="Shapes"]') as HTMLButtonElement;
    shapesBtn.click();
    fixture.detectChanges();

    const instantCheckbox = compiled.querySelector('.instant-checkbox') as HTMLInputElement;
    expect(instantCheckbox).toBeTruthy();
    expect(instantCheckbox.checked).toBe(false);
    expect(editorState.shapeInstant()).toBe(false);

    editorState.activeShapeDraft.set({
      rect: { x: 20, y: 20, width: 100, height: 100 },
      shapeType: 'rectangle',
      outlineWidth: 8,
      outlineColor: '#000000',
      fillColor: TRANSPARENT_COLOR,
    });
    fixture.detectChanges();

    instantCheckbox.click();
    fixture.detectChanges();

    expect(instantCheckbox.checked).toBe(true);
    expect(editorState.shapeInstant()).toBe(true);
    expect(commitSpy).toHaveBeenCalledTimes(1);
    expect(editorState.activeShapeDraft()).toBeNull();

    instantCheckbox.click();
    fixture.detectChanges();
    expect(instantCheckbox.checked).toBe(false);
    expect(editorState.shapeInstant()).toBe(false);
  });

  it('opens New Image dialog from File -> New..., suppresses tool shortcuts, and cancels cleanly', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const editorState = TestBed.inject(EditorStateService);

    const fileTrigger = compiled.querySelector('.menu-trigger') as HTMLButtonElement;
    fileTrigger.click();
    fixture.detectChanges();

    const newItem = Array.from(compiled.querySelectorAll('.menu-action')).find((el) =>
      el.textContent?.includes('New...'),
    ) as HTMLButtonElement;
    expect(newItem).toBeTruthy();

    newItem.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.menu-dropdown')).toBeNull();
    expect(compiled.querySelector('app-new-image-dialog')).toBeTruthy();

    // Tool shortcut should not trigger while modal is open
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
    fixture.detectChanges();
    expect(editorState.activeTool()).toBe('pencil');

    const cancelBtn = Array.from(compiled.querySelectorAll('.dialog-btn')).find(
      (btn) => btn.textContent?.trim() === 'Cancel',
    ) as HTMLButtonElement;
    cancelBtn.click();
    fixture.detectChanges();

    expect(compiled.querySelector('app-new-image-dialog')).toBeNull();
    expect(editorState.canvasWidth()).toBe(1280);
    expect(editorState.canvasHeight()).toBe(1024);
  });

  it('creates a new image with chosen dimensions and fill color and remembers the fill color', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const editorState = TestBed.inject(EditorStateService);
    const canvasDoc = TestBed.inject(CanvasDocumentService);
    const newDocSpy = vi.spyOn(canvasDoc, 'newDocument');

    const openFileNew = () => {
      const fileTrigger = compiled.querySelector('.menu-trigger') as HTMLButtonElement;
      fileTrigger.click();
      fixture.detectChanges();
      const newItem = Array.from(compiled.querySelectorAll('.menu-action')).find((el) =>
        el.textContent?.includes('New...'),
      ) as HTMLButtonElement;
      newItem.click();
      fixture.detectChanges();
    };

    openFileNew();

    const widthInput = compiled.querySelector('#new-image-width') as HTMLInputElement;
    const heightInput = compiled.querySelector('#new-image-height') as HTMLInputElement;
    widthInput.value = '640';
    widthInput.dispatchEvent(new Event('input'));
    heightInput.value = '480';
    heightInput.dispatchEvent(new Event('input'));

    const dialogWhiteSwatch = compiled.querySelector(
      'app-new-image-dialog button[aria-label="Select color #ffffff"]',
    ) as HTMLButtonElement;
    dialogWhiteSwatch.click();
    fixture.detectChanges();

    const createBtn = compiled.querySelector(
      'app-new-image-dialog button[type="submit"]',
    ) as HTMLButtonElement;
    createBtn.click();
    fixture.detectChanges();

    expect(newDocSpy).toHaveBeenCalledWith(640, 480, '#ffffff');
    expect(compiled.querySelector('app-new-image-dialog')).toBeNull();
    expect(editorState.canvasWidth()).toBe(640);
    expect(editorState.canvasHeight()).toBe(480);
    expect(compiled.querySelector('.status-bar')?.textContent).toContain('640 × 480 px');

    // Reopening remembers 640x480 and #ffffff, and allows switching back to Transparent
    openFileNew();
    expect((compiled.querySelector('#new-image-width') as HTMLInputElement).value).toBe('640');
    expect((compiled.querySelector('#new-image-height') as HTMLInputElement).value).toBe('480');
    expect(compiled.querySelector('app-new-image-dialog .fill-value')?.textContent?.trim()).toBe(
      '#FFFFFF',
    );

    const transparentBtn = compiled.querySelector(
      'app-new-image-dialog .transparent-btn',
    ) as HTMLButtonElement;
    transparentBtn.click();
    fixture.detectChanges();

    const createAgainBtn = compiled.querySelector(
      'app-new-image-dialog button[type="submit"]',
    ) as HTMLButtonElement;
    createAgainBtn.click();
    fixture.detectChanges();

    expect(newDocSpy).toHaveBeenCalledWith(640, 480, TRANSPARENT_COLOR);
  });

  it('opens Save Image dialog from File -> Save..., suppresses shortcuts, and saves with chosen filename', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const editorState = TestBed.inject(EditorStateService);
    const canvasDoc = TestBed.inject(CanvasDocumentService);
    const saveSpy = vi.spyOn(canvasDoc, 'saveImage');

    const openFileSave = () => {
      const fileTrigger = compiled.querySelector('.menu-trigger') as HTMLButtonElement;
      fileTrigger.click();
      fixture.detectChanges();
      const saveItem = Array.from(compiled.querySelectorAll('.menu-action')).find((el) =>
        el.textContent?.includes('Save...'),
      ) as HTMLButtonElement;
      expect(saveItem).toBeTruthy();
      saveItem.click();
      fixture.detectChanges();
    };

    openFileSave();

    expect(compiled.querySelector('.menu-dropdown')).toBeNull();
    expect(compiled.querySelector('app-save-image-dialog')).toBeTruthy();
    expect((compiled.querySelector('#save-image-filename') as HTMLInputElement).value).toBe(
      'untitled',
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
    fixture.detectChanges();
    expect(editorState.activeTool()).toBe('pencil');

    const cancelBtn = Array.from(compiled.querySelectorAll('app-save-image-dialog .dialog-btn')).find(
      (btn) => btn.textContent?.trim() === 'Cancel',
    ) as HTMLButtonElement;
    cancelBtn.click();
    fixture.detectChanges();

    expect(compiled.querySelector('app-save-image-dialog')).toBeNull();
    expect(saveSpy).not.toHaveBeenCalled();

    openFileSave();
    const filenameInput = compiled.querySelector('#save-image-filename') as HTMLInputElement;
    filenameInput.value = 'poster';
    filenameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveBtn = compiled.querySelector(
      'app-save-image-dialog button[type="submit"]',
    ) as HTMLButtonElement;
    saveBtn.click();
    fixture.detectChanges();

    expect(saveSpy).toHaveBeenCalledWith('poster.png');
    expect(compiled.querySelector('app-save-image-dialog')).toBeNull();
    expect(editorState.fileName()).toBe('poster.png');
    expect(compiled.querySelector('.status-bar')?.textContent).toContain('poster.png');

    openFileSave();
    expect((compiled.querySelector('#save-image-filename') as HTMLInputElement).value).toBe(
      'poster',
    );
  });

  it('opens pasted clipboard image immediately when clean and prompts confirmation when unsaved changes exist', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const editorState = TestBed.inject(EditorStateService);
    const canvasDoc = TestBed.inject(CanvasDocumentService);
    const openSpy = vi.spyOn(canvasDoc, 'openImageFile').mockResolvedValue();

    const makePasteEvent = (file: File | null) => {
      const event = new Event('paste', { cancelable: true }) as ClipboardEvent;
      Object.defineProperty(event, 'clipboardData', {
        value: {
          items: file
            ? [{ kind: 'file', type: file.type, getAsFile: () => file }]
            : [],
          files: file ? [file] : [],
        },
      });
      return event;
    };

    const imageFile = new File(['png'], 'pasted.png', { type: 'image/png' });

    // 1. Clean document: pastes immediately without confirmation
    window.dispatchEvent(makePasteEvent(imageFile));
    fixture.detectChanges();
    expect(openSpy).toHaveBeenCalledWith(imageFile);
    expect(compiled.querySelector('app-confirm-dialog')).toBeNull();

    openSpy.mockClear();

    // 2. Dirty document: opens confirmation dialog, Cancel aborts, Replace opens
    editorState.markDirty();
    window.dispatchEvent(makePasteEvent(imageFile));
    fixture.detectChanges();

    expect(openSpy).not.toHaveBeenCalled();
    expect(compiled.querySelector('app-confirm-dialog')).toBeTruthy();

    const cancelBtn = Array.from(compiled.querySelectorAll('app-confirm-dialog .dialog-btn')).find(
      (btn) => btn.textContent?.trim() === 'Cancel',
    ) as HTMLButtonElement;
    cancelBtn.click();
    fixture.detectChanges();

    expect(compiled.querySelector('app-confirm-dialog')).toBeNull();
    expect(openSpy).not.toHaveBeenCalled();

    window.dispatchEvent(makePasteEvent(imageFile));
    fixture.detectChanges();
    const replaceBtn = compiled.querySelector(
      'app-confirm-dialog .dialog-btn.primary',
    ) as HTMLButtonElement;
    replaceBtn.click();
    fixture.detectChanges();

    expect(compiled.querySelector('app-confirm-dialog')).toBeNull();
    expect(openSpy).toHaveBeenCalledWith(imageFile);

    openSpy.mockClear();

    // 3. After saving, dirty is cleared so next paste opens immediately without prompt
    canvasDoc.saveImage('saved');
    window.dispatchEvent(makePasteEvent(imageFile));
    fixture.detectChanges();
    expect(compiled.querySelector('app-confirm-dialog')).toBeNull();
    expect(openSpy).toHaveBeenCalledWith(imageFile);

    openSpy.mockClear();

    // 4. Non-image paste or paste inside a text input is ignored
    const textOnlyEvent = makePasteEvent(null);
    window.dispatchEvent(textOnlyEvent);
    expect(openSpy).not.toHaveBeenCalled();

    const numberInput = compiled.querySelector('.size-number-input') as HTMLInputElement;
    const inputPaste = makePasteEvent(imageFile);
    numberInput.dispatchEvent(inputPaste);
    expect(openSpy).not.toHaveBeenCalled();
  });
});
