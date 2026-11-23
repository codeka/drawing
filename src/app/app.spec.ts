import { TestBed } from '@angular/core/testing';
import { App } from './app';

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

  it('updates dynamic tool options label when switching tools', async () => {
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
  });
});
