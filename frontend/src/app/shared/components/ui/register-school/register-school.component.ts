import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../../environments/environments';
import { GoogleMap, MapMarker } from '@angular/google-maps';
import { LabelComponent } from '../../form/label/label.component';
import { SelectComponent } from '../../form/select/select.component';
import { InputFieldFixedComponent } from '../../form/input/input-field-fixed.component';

@Component({
  selector: 'app-register-school',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    GoogleMap,
    MapMarker,
    LabelComponent,
    SelectComponent,
    InputFieldFixedComponent
  ],
  templateUrl: './register-school.component.html',
  styleUrl: './register-school.component.css'
})
export class RegisterSchoolComponent implements OnInit, OnDestroy {
  step = signal(1);
  formData = signal<any>({});
  isSubmitting = signal(false);
  addressError: string | null = null;
  isMobileVerified = signal(false);
  otpSent = signal(false);
  isSendingOtp = signal(false);
  isVerifyingOtp = signal(false);
  isSuperadmin = signal(false);
  skipOtpVerification = signal(false);

  schoolForm: FormGroup;
  addressForm: FormGroup;
  otpForm: FormGroup;

  center: google.maps.LatLngLiteral = { lat: 28.6139, lng: 77.2090 }; // Delhi
  zoom = 12;
  markerPosition: google.maps.LatLngLiteral | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private toastr: ToastrService
  ) {
    this.schoolForm = this.fb.group({
    schoolName: ['', Validators.required],
    adminName: ['', Validators.required],
    username: ['', [Validators.required, Validators.minLength(6)]],
    email: ['', [Validators.required, Validators.email]],
    mobileNo: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{9,14}$/)]],
    preferredChannel: ['sms', Validators.required],
    whatsappOptIn: [false],

    // ←←← FIX THESE 4 LINES
    smsSenderName: ['EDGLOBE', [Validators.required, Validators.maxLength(11)]],
    emailFrom: ['', [Validators.required, Validators.email]],
    emailName: [''],
    emailPass: ['', Validators.required],   // ← ADD THIS LINE
    openingTime: ['08:00'],
    closingTime: ['14:00'],
    lunchBreak: ['12:00 - 12:30'],
    assignTrial: [false],                         // Checkbox: assign trial or not
    trialDurationDays: ['14'],                      // Default 14 days
    customTrialDays: [null],                       // For custom input
    skipOtpSuper: [false]
  });

    this.addressForm = this.fb.group({
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      country: ['', Validators.required],
      postalCode: ['', Validators.required],
      latitude: [null, Validators.required],
      longitude: [null, Validators.required]
    });

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

 ngOnInit(): void {
  const role = localStorage.getItem('role');
  this.isSuperadmin.set(role === 'superadmin');

  // ★★★ IMPORTANT FIX ★★★ Auto-sync form changes to formData
  this.schoolForm.valueChanges.subscribe(() => {
    this.formData.update(value => ({
      ...value,
      ...this.schoolForm.value  // ← This pulls latest trialDurationDays, customTrialDays, etc.
    }));
  });
}

  // Step Navigation
  nextStep() {
  if (this.step() === 1) {
    // Validate Step 1 fields (same as before)
    const step1Fields = [
      'schoolName', 'adminName', 'username', 'email', 'mobileNo',
      'preferredChannel', 'smsSenderName', 'emailFrom', 'emailPass'
    ];

    step1Fields.forEach(field => this.schoolForm.get(field)?.markAsTouched());

    if (step1Fields.some(field => this.schoolForm.get(field)?.invalid)) {
      this.toastr.warning('Please complete all required fields in Step 1', 'Validation Error');
      return;
    }

    // Superadmin fast-track: Skip OTP completely
    const skipOtp = this.schoolForm.get('skipOtpSuper')?.value && this.isSuperadmin();

    if (skipOtp) {
      this.formData.set({
        ...this.formData(),
        ...this.schoolForm.value,
        isMobileVerified: true  // ← Force true for backend
      });
      this.step.set(3);  // Jump to Address step
      // this.toastr.success('Fast-track mode activated – OTP skipped', 'Superadmin Action');
    this.toastr.success('Fast-track mode activated – OTP skipped', 'Success', { positionClass: 'toast-top-center' });

      return;
    }

    // Normal flow
    this.formData.set({ ...this.formData(), ...this.schoolForm.value });
    this.sendOtp();
  }
  else if (this.step() === 2) {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      this.toastr.warning('Please enter valid OTP', 'Validation Error');
      return;
    }
    this.verifyOtp();
  } 
  else if (this.step() === 3) {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      this.toastr.warning('Please complete address and location', 'Validation Error');
      return;
    }

    this.formData.update(value => ({
      ...value,
      address: this.addressForm.value,
      latitude: this.addressForm.value.latitude,
      longitude: this.addressForm.value.longitude,
      isMobileVerified: this.isMobileVerified()
    }));

    this.submitForm();
  }
}

  prevStep() {
    if (this.step() > 1) this.step.set(this.step() - 1);
  }

  // OTP Flow
  sendOtp() {
    if (this.isSendingOtp()) return;
    this.isSendingOtp.set(true);
    const mobileNo = this.formData().mobileNo;

    this.http.post(`${environment.apiUrl}/api/auth/send-otp`, { phoneNumber: mobileNo }).subscribe({
      next: () => {
        this.otpSent.set(true);
        
        this.toastr.success(`OTP sent to ${mobileNo}`, 'Success',{ positionClass: 'toast-top-center' });
        this.step.set(2);
        this.isSendingOtp.set(false);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Failed to send OTP', 'Error');
        this.isSendingOtp.set(false);
      }
    });
  }

  verifyOtp() {
    if (this.isVerifyingOtp()) return;
    this.isVerifyingOtp.set(true);
    const { mobileNo } = this.formData();
    const otp = this.otpForm.value.otp;

    this.http.post(`${environment.apiUrl}/api/auth/verify-otp`, { phoneNumber: mobileNo, code: otp }).subscribe({
      next: () => {
        this.isMobileVerified.set(true);
        this.toastr.success('Mobile verified successfully', 'Success',{ positionClass: 'toast-top-center' });
        
        this.step.set(3);
        this.isVerifyingOtp.set(false);
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Invalid OTP', 'Error');
        this.isVerifyingOtp.set(false);
      }
    });
  }

  // Final Submit
 submitForm() {
  if (this.isSubmitting()) return;
  this.isSubmitting.set(true);

  this.formData.update(value => ({
    ...value,
    ...this.schoolForm.value,
    assignTrial: this.schoolForm.get('assignTrial')?.value ?? false,
    trialDurationDays: this.schoolForm.get('trialDurationDays')?.value ?? null,
  }));

  const d = this.formData();
  const skipOtp = this.schoolForm.get('skipOtpSuper')?.value && this.isSuperadmin();
  const finalIsVerified = skipOtp ? true : this.isMobileVerified();

  const payload = {
    schoolName: d.schoolName,
    adminName: d.adminName,
    username: d.username,
    email: d.email,
    mobileNo: d.mobileNo,
    preferredChannel: d.preferredChannel,
    whatsappOptIn: d.whatsappOptIn,
    smsSenderName: d.smsSenderName,
    emailFrom: d.emailFrom,
    emailName: d.emailName,
    emailPass: d.emailPass,
    openingTime: d.openingTime,
    closingTime: d.closingTime,
    lunchBreak: d.lunchBreak,
    assignTrial: d.assignTrial,               // ← Now correct (from formData)
    trialDurationDays: d.trialDurationDays,   // ← Now correct (from formData)
    address: {
      street: d.address?.street,
      city: d.address?.city,
      state: d.address?.state,
      country: d.address?.country,
      postalCode: d.address?.postalCode
    },
    latitude: d.latitude,
    longitude: d.longitude,
    isMobileVerified: finalIsVerified
  };

  console.log('Submitting registration:', payload);  // ← Keep this for debugging

  this.authService.registerSchool(payload).subscribe({
    next: (res: any) => {
      this.toastr.success(
        `Welcome to ${res.data.schoolName}! Check your email for password reset link.`,
        'Registration Successful',
        { positionClass: 'toast-top-center', timeOut: 6000 }
      );
      setTimeout(() => {
        this.router.navigate(['/confirmation'], {
          queryParams: {
            schoolName: payload.schoolName,
            email: payload.email,
            mobileNo: payload.mobileNo
          }
        });
        this.isSubmitting.set(false);
      }, 2000);
    },
    error: (err: any) => {
      this.toastr.error(err.error?.message || 'Registration failed', 'Error');
      this.isSubmitting.set(false);
    }
  });
}

  // Getters
  get f() { return this.schoolForm.controls; }
  get a() { return this.addressForm.controls; }
  get o() { return this.otpForm.controls; }

  // Map Click
  onMapClick(event: google.maps.MapMouseEvent) {
    if (!event.latLng) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    this.addressForm.patchValue({ latitude: lat, longitude: lng });
    this.markerPosition = { lat, lng };
    this.reverseGeocode(lat, lng);
    this.addressError = null;
    this.toastr.success(`Location set: ${lat.toFixed(6)}, ${lng.toFixed(6)}`, 'Success',{ positionClass: 'toast-top-center' });
  }

  private reverseGeocode(lat: number, lng: number) {
    if (!window.google?.maps) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const addr = results[0];
        const comp = addr.address_components || [];
        this.addressForm.patchValue({
          street: addr.formatted_address || '',
          city: comp.find(c => c.types.includes('locality'))?.long_name || '',
          state: comp.find(c => c.types.includes('administrative_area_level_1'))?.long_name || '',
          country: comp.find(c => c.types.includes('country'))?.long_name || '',
          postalCode: comp.find(c => c.types.includes('postal_code'))?.long_name || ''
        });
      } else {
        this.toastr.warning('Could not fetch address. Enter manually.', 'Info');
      }
    });
  }

  ngOnDestroy(): void {}
}