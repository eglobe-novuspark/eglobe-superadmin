import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface Option {
  value: string;
  label: string;
}

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './select.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent implements ControlValueAccessor {
  @Input() options: Option[] = [];
  @Input() placeholder: string = 'Select an option';
  @Input() className: string = '';

  value: string = ''; // internal value

  // ControlValueAccessor methods (required)
  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  // Write value from form control
  writeValue(value: string): void {
    if (value !== undefined && value !== null) {
      this.value = value;
    }
  }

  // Register change handler
  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  // Register touched handler
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  // Handle selection change
  onSelectChange(event: Event): void {
    const selectedValue = (event.target as HTMLSelectElement).value;
    this.value = selectedValue;
    this.onChange(selectedValue); // Tell form control about change
    this.onTouched();             // Mark as touched
  }

  // Optional: set disabled state if needed
  setDisabledState?(isDisabled: boolean): void {
    // Add disabled logic if you need it later
  }
}