import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../../../environment/environments';
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
export class RegisterSchoolComponent {
  step = signal(1);
  formData = signal<any>({});
  isSubmitting = signal(false);
  isMobileVerified = signal(false);
  otpSent = signal(false);
  isSendingOtp = signal(false);
  isVerifyingOtp = signal(false);
  isSuperadmin = signal(false);

  schoolForm: FormGroup;
  addressForm: FormGroup;
  otpForm: FormGroup;

  center: google.maps.LatLngLiteral = { lat: 28.6139, lng: 77.2090 };
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
      preferredChannel: ['both', Validators.required],
      whatsappOptIn: [true],

      smsSenderName: ['EDGLOBE', [Validators.required, Validators.maxLength(11)]],
      emailFrom: ['', [Validators.required, Validators.email]],
      emailName: [''],
      emailPass: ['', Validators.required],

      openingTime: ['08:00'],
      closingTime: ['14:00'],
      lunchBreak: ['12:00 - 12:30'],

      // Academic Year – mandatory
      academicYearName: ['2025-2026', Validators.required],
      // academicYearStartDate: ['', Validators.required],
      // academicYearEndDate: ['', Validators.required],

      // Subscription control
      assignSubscriptionNow: [false],
      subscriptionType: ['trial'],
      subscriptionDurationDays: [14, Validators.min(1)],
      

      // Fast-track – superadmin only
      fastTrack: [false]
    });

    this.addressForm = this.fb.group({
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      country: ['India', Validators.required],
      postalCode: ['', Validators.required],
      latitude: [null, Validators.required],
      longitude: [null, Validators.required]
    });

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  ngOnInit() {
    const role = localStorage.getItem('role');
    this.isSuperadmin.set(role === 'superadmin');

    this.schoolForm.valueChanges.subscribe(values => {
      this.formData.update(v => ({ ...v, ...values }));
    });
  }

  nextStep() {
    if (this.step() === 1) {
      const requiredFields = [
        'schoolName', 'adminName', 'username', 'email', 'mobileNo',
        'preferredChannel', 'smsSenderName', 'emailFrom', 'emailPass',
        'academicYearName'
      ];

      requiredFields.forEach(f => this.schoolForm.get(f)?.markAsTouched());

      if (requiredFields.some(f => this.schoolForm.get(f)?.invalid)) {
        this.toastr.warning('Please fill all required fields', 'Validation Error');
        return;
      }

      const fastTrack = this.schoolForm.get('fastTrack')?.value && this.isSuperadmin();

      if (fastTrack) {
        this.formData.set({
          ...this.formData(),
          ...this.schoolForm.value,
          isMobileVerified: true
        });
        this.step.set(3);
        this.toastr.success('Fast-track enabled – OTP skipped', 'Superadmin', {
          positionClass: 'toast-top-center'
        });
        return;
      }

      this.formData.set({ ...this.formData(), ...this.schoolForm.value });
      this.sendOtp();
    }
    else if (this.step() === 2) {
      if (this.otpForm.invalid) {
        this.toastr.warning('Please enter valid 6-digit OTP', 'Validation');
        return;
      }
      this.verifyOtp();
    }
    else if (this.step() === 3) {
      if (this.addressForm.invalid) {
        this.toastr.warning('Please complete school address and location', 'Validation');
        return;
      }

      this.formData.update(v => ({
        ...v,
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

  sendOtp() {
    if (this.isSendingOtp()) return;
    this.isSendingOtp.set(true);

    const mobile = this.formData().mobileNo;

    this.http.post(`${environment.apiUrl}/api/auth/send-otp`, { phoneNumber: mobile })
      .subscribe({
        next: () => {
          this.otpSent.set(true);
          this.toastr.success(`OTP sent to ${mobile}`, 'Success', { positionClass: 'toast-top-center' });
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

    this.http.post(`${environment.apiUrl}/api/auth/verify-otp`, { phoneNumber: mobileNo, code: otp })
      .subscribe({
        next: () => {
          this.isMobileVerified.set(true);
          this.toastr.success('Mobile number verified', 'Success', { positionClass: 'toast-top-center' });
          this.step.set(3);
          this.isVerifyingOtp.set(false);
        },
        error: (err) => {
          this.toastr.error(err.error?.message || 'Invalid OTP', 'Error');
          this.isVerifyingOtp.set(false);
        }
      });
  }

  submitForm() {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);

    const d = this.formData();
    const fastTrack = this.schoolForm.get('fastTrack')?.value && this.isSuperadmin();
    const finalVerified = fastTrack ? true : this.isMobileVerified();

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
      emailName: d.emailName || d.schoolName,
      emailPass: d.emailPass,

      openingTime: d.openingTime,
      closingTime: d.closingTime,
      lunchBreak: d.lunchBreak,

      academicYearName: d.academicYearName,
      // academicYearStartDate: d.academicYearStartDate,
      // academicYearEndDate: d.academicYearEndDate,

      fastTrack: fastTrack,
      assignSubscriptionNow: d.assignSubscriptionNow || false,
      subscriptionType: d.subscriptionType || 'trial',
      subscriptionDurationDays: Number(d.subscriptionDurationDays) || 14,

      address: {
        street: d.address?.street?.trim(),
        city: d.address?.city?.trim(),
        state: d.address?.state?.trim(),
        country: d.address?.country?.trim(),
        postalCode: d.address?.postalCode?.trim()
      },
      latitude: Number(d.latitude),
      longitude: Number(d.longitude),
      isMobileVerified: finalVerified
    };

    console.log('[SCHOOL REGISTRATION PAYLOAD]', payload);

    this.authService.registerSchool(payload).subscribe({
      next: (res: any) => {
        this.toastr.success(
          `School "${res.data.schoolName}" created successfully! Password reset link sent to email.`,
          'Success',
          { positionClass: 'toast-top-center', timeOut: 7000 }
        );

        setTimeout(() => {
          this.router.navigate(['/confirmation'], {
            queryParams: {
              schoolName: payload.schoolName,
              email: payload.email,
              mobileNo: payload.mobileNo
            }
          });
        }, 2000);

        this.isSubmitting.set(false);
      },
      error: (err: any) => {
        this.toastr.error(
          err.error?.message || 'School registration failed. Please check the form and try again.',
          'Error',
          { positionClass: 'toast-top-right', timeOut: 8000 }
        );
        this.isSubmitting.set(false);
      }
    });
  }

  onMapClick(event: google.maps.MapMouseEvent) {
    if (!event.latLng) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    this.addressForm.patchValue({ latitude: lat, longitude: lng });
    this.markerPosition = { lat, lng };
    this.reverseGeocode(lat, lng);
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
          country: comp.find(c => c.types.includes('country'))?.long_name || 'India',
          postalCode: comp.find(c => c.types.includes('postal_code'))?.long_name || ''
        });
      }
    });
  }

  get f() { return this.schoolForm.controls; }
  get a() { return this.addressForm.controls; }
  get o() { return this.otpForm.controls; }
}