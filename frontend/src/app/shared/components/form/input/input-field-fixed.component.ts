import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  forwardRef,
  Input,
  Output,
  OnDestroy
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';

@Component({
  selector: 'app-input-field-fixed',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="relative">
      <input
        [type]="type"
        [id]="id"
        [name]="name"
        [placeholder]="placeholder"
        [disabled]="disabled"
        [value]="internalValue"
        (input)="handleInput($event)"
        (blur)="handleBlur()"
        [class]="inputClasses"
      />

      @if (hint) {
        <p class="mt-1.5 text-xs"
          [class]="{
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
      useExisting: forwardRef(() => InputFieldFixedComponent),
      multi: true
    }
  ]
})
export class InputFieldFixedComponent implements ControlValueAccessor, OnDestroy {
  @Input() type: string = 'text';
  @Input() id: string = '';
  @Input() name: string = '';
  @Input() placeholder: string = '';
  @Input() disabled: boolean = false;
  @Input() success: boolean = false;
  @Input() error: boolean = false;
  @Input() hint: string = '';
  @Input() className: string = '';

  @Output() valueChange = new EventEmitter<string | number>();

  internalValue: any = '';

  // ControlValueAccessor callbacks with proper initialization
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};

  ngOnDestroy(): void {
    // Clean up to prevent memory leaks
    this.onChange = () => {};
    this.onTouched = () => {};
  }

  // ControlValueAccessor implementation
  writeValue(value: any): void {
    this.internalValue = value ?? '';
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

  // Event handlers
  handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    let value: any = target.value;

    if (this.type === 'number') {
      value = value ? parseFloat(value) : null;
    }

    this.internalValue = value;
    this.onChange(value);
    this.valueChange.emit(value);
  }

  handleBlur(): void {
    this.onTouched();
  }

  // Style classes
  get inputClasses(): string {
    const base = [
      'w-full',
      'rounded-lg',
      'border',
      'px-4',
      'py-2.5',
      'text-sm',
      'shadow-sm',
      'placeholder:text-gray-400',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-blue-500',
      'transition-colors'
    ];

    if (this.disabled) {
      base.push('bg-gray-100', 'cursor-not-allowed', 'opacity-60');
    }

    if (this.error) {
      base.push('border-red-500', 'focus:ring-red-500');
    } else if (this.success) {
      base.push('border-green-500', 'focus:ring-green-500');
    } else {
      base.push('border-gray-300');
    }

    if (this.className) {
      base.push(this.className);
    }

    return base.join(' ');
  }
}