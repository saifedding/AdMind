import React from 'react';
import { Input } from './input';
import { Label } from './label';

export interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Simple DatePicker component using HTML5 date input
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  placeholder,
  disabled,
  className,
}) => {
  return (
    <div className={className}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <Input
        type="date"
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
};