import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  forwardRef
} from '@angular/core';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule
} from '@angular/forms';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="relative">
      <input
        [type]="type"
        [id]="id"
        [name]="name"
        [placeholder]="placeholder"
        [value]="value"
        [disabled]="disabled"
        [ngClass]="inputClasses"
        (input)="onInput($event)"
        (blur)="onTouched()"
      />

      @if (hint) {
        <p class="mt-1 text-xs leading-relaxed"
          [ngClass]="{
            'text-red-500': error,
            'text-green-500': success,
            'text-gray-500': !error && !success
          }">
          {{ hint }}
        </p>
      }
    </div>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputFieldComponent),
      multi: true,
    },
  ],
})
export class InputFieldComponent implements ControlValueAccessor {
  @Input() type: string = 'text';
  @Input() id?: string = '';
  @Input() name?: string = '';
  @Input() placeholder?: string = '';
  @Input() value: string | number | null = null;  // Allow null for empty
  @Input() min?: string;
  @Input() max?: string;
  @Input() step?: number;
  @Input() disabled: boolean = false;
  @Input() success: boolean = false;
  @Input() error: boolean = false;
  @Input() hint?: string;
  @Input() className: string = '';
  @Output() valueChange = new EventEmitter<string | number | null>();

  // Internal callbacks
  onChange: (value: any) => void = () => {};
  onTouched: () => void = () => {};

  // --- ControlValueAccessor methods ---
  writeValue(value: any): void {
    this.value = value ?? null;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let newValue: string | number | null;
    if (this.type === 'number') {
      newValue = input.value ? Number(input.value) : null;
    } else {
      newValue = input.value || null;
    }
    this.value = newValue;
    this.onChange(newValue);
    this.valueChange.emit(newValue);
  }

  get inputClasses(): string {
    let inputClasses = `mt-1 block w-full h-11 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-500 dark:focus:ring-indigo-400 ${this.className}`;
    if (this.error) {
      inputClasses += ' border-red-500 focus:ring-red-500 dark:border-red-500 dark:focus:ring-red-400';
    } else if (this.success) {
      inputClasses += ' border-green-500 focus:ring-green-500 dark:border-green-500 dark:focus:ring-green-400';
    }
    if (this.disabled) {
      inputClasses += ' opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700';
    }
    return inputClasses;
  }
}