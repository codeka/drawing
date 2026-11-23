import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { EditorStateService } from './core/editor-state.service';

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
});
