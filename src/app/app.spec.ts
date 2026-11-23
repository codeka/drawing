import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';
import { CanvasDocumentService } from './core/canvas-document.service';
import { EditorStateService } from './core/editor-state.service';
import { TRANSPARENT_COLOR } from './models/tool.model';

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

  it('renders File, Edit, and View menus, all 4 tools, canvas, and 1280x1024 status', async () => {
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
    expect(toolButtons).toEqual(['Pencil', 'Fill', 'Eraser', 'Text']);

    const canvas = compiled.querySelector('canvas');
    expect(canvas).toBeTruthy();

    expect(compiled.querySelector('.status-bar')?.textContent).toContain('1280 × 1024 px');
  });

  it('updates dynamic tool options label and shows empty placeholder for Fill and Text', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const textBtn = compiled.querySelector('button[aria-label="Text"]') as HTMLButtonElement;
    textBtn.click();
    fixture.detectChanges();

    expect(compiled.querySelector('.options-group .group-label')?.textContent?.trim()).toBe(
      'Text Options',
    );
    expect(compiled.querySelector('.options-empty')?.textContent?.trim()).toBe('No options yet');
  });

  it('renders independent size slider and number input for Pencil (1px) and Eraser (10px)', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const editorState = TestBed.inject(EditorStateService);

    const slider = compiled.querySelector('.size-slider') as HTMLInputElement;
    const numberInput = compiled.querySelector('.size-number-input') as HTMLInputElement;
    expect(slider.value).toBe('1');
    expect(numberInput.value).toBe('1');

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
    expect(cursorEl.style.left).toBe('100px');
    expect(cursorEl.style.top).toBe('50px');
    expect(cursorEl.style.width).toBe('1px');
    expect(cursorEl.style.height).toBe('1px');

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
});
