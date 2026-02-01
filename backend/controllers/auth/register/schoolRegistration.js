const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const User = require('../../../models/User');
const School = require('../../../models/School');
const AcademicYear = require('../../../models/academicyear');
const Subscription = require('../../../models/subscription');
const PendingSchool = require('../../../models/pendingSchool');
const Notification = require('../../../models/notification');
const AuditLog = require('../../../models/auditLogs'); // corrected model name
const subscriptionPlans = require('../../../utils/subscriptionPlans');
const WhatsAppService = require('../../../services/whatsapp.service');

// const registerSchool = async (req, res) => {
//   const session = await mongoose.startSession();
//   try {
//     await session.withTransaction(async () => {
//       const {
//         schoolName,
//         adminName,
//         username,
//         email,
//         mobileNo,
//         address,
//         latitude,
//         longitude,
//         preferredChannel,
//         whatsappOptIn = false,
//         pendingSchoolId,
//         isMobileVerified,
//         smsSenderName,
//         emailFrom,
//         emailName,
//         emailPass,
//         openingTime,
//         closingTime,
//         lunchBreak,
//         assignTrial = false,           // NEW: default false
//         trialDurationDays = null       // NEW: null if not assigned
//       } = req.body;

//       /* ────────────────────── 1. AUTH & OTP ────────────────────── */
//       if (!req.user || !req.user.id) {
//         throw { status: 401, message: 'Unauthorized: Invalid user session' };
//       }
//       if (!isMobileVerified) {
//         throw { status: 400, message: 'Mobile number must be verified before registration' };
//       }

//       /* ────────────────────── 2. PENDING SCHOOL (optional) ────────────────────── */
//       if (pendingSchoolId) {
//         const pending = await PendingSchool.findById(pendingSchoolId).session(session);
//         if (!pending || pending.status !== 'approved') {
//           throw { status: 400, message: 'Invalid or unapproved pending school request' };
//         }
//       }

//       /* ────────────────────── 3. REQUIRED FIELDS ────────────────────── */
//       const required = ['schoolName','adminName','username','email','mobileNo','address','latitude','longitude','preferredChannel'];
//       const missing = required.filter(f => !req.body[f]);
//       if (missing.length) throw { status: 400, message: `Missing: ${missing.join(', ')}` };

//       /* ────────────────────── 4. COORDINATES ────────────────────── */
//       if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
//           latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
//         throw { status: 400, message: 'Invalid latitude or longitude' };
//       }

//       /* ────────────────────── 5. MOBILE ────────────────────── */
//       if (!/^\+?[1-9]\d{9,14}$/.test(mobileNo)) {
//         throw { status: 400, message: 'Invalid mobile number (e.g., +919876543210)' };
//       }
//       const normalizedMobileNo = mobileNo.startsWith('+') ? mobileNo : `+91${mobileNo.replace(/^\+/, '')}`;

//       /* ────────────────────── 6. CHANNEL ────────────────────── */
//       if (!['sms','whatsapp','both'].includes(preferredChannel)) {
//         throw { status: 400, message: 'Invalid preferredChannel' };
//       }

//       /* ────────────────────── 7. ADDRESS ────────────────────── */
//       const addrKeys = ['street','city','state','country','postalCode'];
//       const missingAddr = addrKeys.filter(k => !address[k]);
//       if (missingAddr.length) throw { status: 400, message: `Address missing: ${missingAddr.join(', ')}` };
//       const addressObj = {
//         street: address.street.trim(),
//         city: address.city.trim(),
//         state: address.state.trim(),
//         country: address.country.trim(),
//         postalCode: address.postalCode.trim()
//       };

//       /* ────────────────────── 8. UNIQUE SCHOOL CODE ────────────────────── */
//       let finalCode;
//       try {
//         const existing = await School.find({}, 'code').session(session);
//         const used = existing.map(s => s.code?.toUpperCase()).filter(Boolean);

//         const words = schoolName.toUpperCase().split(' ').filter(w => w);
//         let base = words.slice(0,2).map(w => w.substring(0,3)).join('');
//         if (base.length < 3) base = schoolName.toUpperCase().substring(0,4);
//         base = base.substring(0,4);

//         let attempt = 0;
//         while (attempt < 50) {
//           const suffix = crypto.randomInt(10,99).toString();
//           finalCode = (base + suffix).substring(0,6).toUpperCase();
//           if (!used.includes(finalCode)) break;
//           attempt++;
//         }
//         if (!finalCode) throw new Error('code-gen');
//       } catch {
//         throw { status: 500, message: 'Failed to generate unique school code' };
//       }

//       /* ────────────────────── 9. DUPLICATES ────────────────────── */
//       const [dupUser, dupSchool] = await Promise.all([
//         User.findOne({ $or: [{ email }, { username }] }).session(session),
//         School.findOne({ name: new RegExp(`^${schoolName}$`,'i') }).session(session)
//       ]);
//       if (dupUser) throw { status: 409, message: 'Email or username already exists' };
//       if (dupSchool) throw { status: 409, message: 'School name already exists' };

//       /* ────────────────────── 10. CREATE DOCS (no save yet) ────────────────────── */
//       const newSchool = new School({
//         name: schoolName,
//         address: addressObj,
//         mobileNo: normalizedMobileNo,
//         email,
//         code: finalCode,
//         latitude,
//         longitude,
//         radius: 100,
//         preferredChannel,
//         weeklyHolidayDay: 'Sunday',
//         smsPackActive: false,
//         status: true,
//         'communication.smsSenderName': smsSenderName || 'EDGLOBE',
//         'communication.emailFrom': emailFrom,
//         'communication.emailName': emailName || schoolName,
//         'communication.emailPass': emailPass || emailPass,
//         'schoolTiming.openingTime': openingTime || '08:00',
//         'schoolTiming.closingTime': closingTime || '14:00',
//         'schoolTiming.lunchBreak': lunchBreak || '12:00 - 12:30'
//       });

//       const currentYear = new Date().getFullYear();
//       const defaultYear = new AcademicYear({
//         schoolId: newSchool._id,
//         name: `${currentYear}-${currentYear + 1}`,
//         startDate: new Date(currentYear, 3, 1),   // april 1
//         endDate: new Date(currentYear + 1, 1, 31), // march 31
//         isActive: true
//       });

//       // ---- RESET TOKEN (saved in DB, never sent in plain text) ----
//       const resetToken = crypto.randomBytes(20).toString('hex');
//       const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour

//       // dummy hash – never used for login
//       const dummyPwd = bcrypt.hashSync(crypto.randomBytes(12).toString('hex'), 10);

//       const adminUser = new User({
//         name: adminName,
//         username,
//         email,
//         password: dummyPwd,
//         role: 'admin',
//         schoolId: newSchool._id,
//         phoneNumber: normalizedMobileNo,
//         whatsappNumber: preferredChannel.includes('whatsapp') ? normalizedMobileNo : null,
//         whatsappOptIn: !!whatsappOptIn,
//         resetToken,
//         resetTokenExpires,
//         status: true
//       });

//       /* ────────────────────── 11. LINK REFERENCES ────────────────────── */
//       newSchool.activeAcademicYear = defaultYear._id;
//       newSchool.createdBy = adminUser._id;

//       /* ────────────────────── 12. SAVE ALL ────────────────────── */
//       await Promise.all([
//         newSchool.save({ session }),
//         adminUser.save({ session }),
//         defaultYear.save({ session })
//       ]);

//       /* ────────────────────── 13. TRIAL SUBSCRIPTION ────────────────────── */
//       const trial = subscriptionPlans.trial;
//       const subscription = new Subscription({
//         schoolId: newSchool._id,
//         planType: 'trial',
//         status: 'active',
//         startsAt: new Date(),
//         expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
//         durationDays: 14,
//         originalAmount: 0,
//         finalAmount: 0,
//         messageLimits: {
//           smsMonthly: trial.smsMonthlyLimit,
//           whatsappMonthly: trial.whatsappMonthlyLimit
//         },
//         usageStats: {
//           students: 0,
//           staff: 0,
//           storage: 0,
//           smsUsedThisMonth: 0,
//           whatsappUsedThisMonth: 0,
//           lastResetDate: new Date()
//         },
//         testMode: process.env.TEST_MODE === 'true'
//       });
//       await subscription.save({ session });

//       /* ────────────────────── 14. PENDING SCHOOL UPDATE ────────────────────── */
//       if (pendingSchoolId) {
//         const p = await PendingSchool.findById(pendingSchoolId).session(session);
//         if (p) { p.status = 'completed'; await p.save({ session }); }
//       }

//       /* ────────────────────── 15. EMAIL WITH RESET LINK ONLY ────────────────────── */

//         if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
//         throw { status: 500, message: 'Email credentials missing in environment' };
//         }

//         const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/auth/reset-password?token=${resetToken}`;

//         const transporter = nodemailer.createTransport({
//         service: 'gmail',
//         auth: {
//             user: process.env.EMAIL_USER,
//             pass: process.env.EMAIL_PASS
//         },
//         tls: {
//             rejectUnauthorized: false
//         }
//         });

//         const html = `
//         <h2>Welcome to EDGlobe Family!</h2>
//         <p>Hi <strong>${adminName}</strong>,</p>
//         <p>Your school <strong>${schoolName}</strong> (Code: <strong>${finalCode}</strong>) is ready!</p>
//         <p><strong>Username:</strong> ${username}</p>
//         <p>
//             <a href="${resetLink}" 
//             style="background:#007bff;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
//             Set Password Now
//             </a>
//         </p>
//         <p><small>Link expires in 1 hour.</small></p>
//         <p>Best,<br>SchoolSync Team</p>
//         `;

//         try {
//         await transporter.sendMail({
//             from: `"SchoolSync" <${process.env.EMAIL_USER}>`,
//             to: email,
//             subject: `Welcome to ${schoolName} – Set Your Password`,
//             html
//         });
//         console.log('Password reset email sent successfully');
//         } catch (emailErr) {
//         console.error('Email failed:', emailErr.message);
//         throw { status: 500, message: 'Failed to send email. Check server logs.' };
//         }
//             /* ────────────────────── 16. WELCOME NOTIFICATION (SMS/WA) ────────────────────── */
//             const notif = new Notification({
//             schoolId: newSchool._id,
//             type: 'welcome',
//             title: `Welcome to ${schoolName}!`,
//             message: `Your school is ready! Set password: ${resetLink}`,
//             recipientId: adminUser._id,
//             senderId: req.user.id,
//             data: {
//                 resetLink,
//                 username,
//                 schoolName,
//                 code: finalCode,
//                 recipientPhone: normalizedMobileNo  // ← THIS WAS MISSING
//             }
//             });

//       /* ────────────────────── 17. AUDIT LOG ────────────────────── */
//       await new auditLogs({
//         userId: req.user.id,
//         action: 'create_school',
//         details: {
//           schoolId: newSchool._id,
//           schoolName,
//           code: finalCode,
//           adminUserId: adminUser._id,
//           latitude,
//           longitude,
//           mobileNo: normalizedMobileNo
//         }
//       }).save({ session });

//       /* ────────────────────── 18. SUCCESS RESPONSE ────────────────────── */
//       res.status(201).json({
//         message: 'School registered. Password-reset link sent to email.',
//         data: {
//           schoolId: newSchool._id,
//           schoolName,
//           code: finalCode,
//           adminUserId: adminUser._id,
//           academicYear: defaultYear.name,
//           subscriptionId: subscription._id,
//           resetLinkSent: true
//         }
//       });
//     });
//   } catch (err) {
//     console.error('Registration Error:', err);
//     const status = err.status || 500;
//     res.status(status).json({
//       message: err.message || 'Registration failed',
//       error: process.env.NODE_ENV === 'development' ? err.stack : undefined
//     });
//   } finally {
//     await session.endSession();
//   }
// };


const registerSchool = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const {
        schoolName,
        adminName,
        username,
        email,
        mobileNo,
        address,
        latitude,
        longitude,
        preferredChannel,
        whatsappOptIn = false,
        pendingSchoolId,
        isMobileVerified,
        smsSenderName,
        emailFrom,
        emailName,
        emailPass,
        openingTime,
        closingTime,
        lunchBreak,
        academicYearName,
        // academicYearStartDate,
        // academicYearEndDate,
        // Superadmin controls only
        fastTrack = false,
        assignSubscriptionNow = false,
        subscriptionType = 'trial',
        subscriptionDurationDays = 14
      } = req.body;

      console.log('Received registration data:', req.body);

      // ────────────────────── 1. AUTH & FAST-TRACK LOGIC ──────────────────────
      if (!req.user || !req.user.id) {
        throw { status: 401, message: 'Unauthorized: Superadmin required' };
      }

      const finalMobileVerified = fastTrack ? true : isMobileVerified;
      if (!finalMobileVerified) {
        throw { status: 400, message: 'Mobile number must be verified before registration' };
      }

      // ────────────────────── 2. PENDING SCHOOL (optional) ──────────────────────
      if (pendingSchoolId) {
        const pending = await PendingSchool.findById(pendingSchoolId).session(session);
        if (!pending || pending.status !== 'approved') {
          throw { status: 400, message: 'Invalid or unapproved pending school request' };
        }
      }

      // ────────────────────── 3. REQUIRED FIELDS ──────────────────────
      const required = [
        'schoolName', 'adminName', 'username', 'email', 'mobileNo',
        'address', 'latitude', 'longitude', 'preferredChannel',
        'academicYearName', 
      ];
      const missing = required.filter(f => !req.body[f]);
      if (missing.length) {
        throw { status: 400, message: `Missing fields: ${missing.join(', ')}` };
      }

      // ────────────────────── 4. SUBSCRIPTION VALIDATION (only when assigned) ──────────────────────
      if (assignSubscriptionNow) {
        if (!['trial', 'basic', 'premium'].includes(subscriptionType)) {
          throw { status: 400, message: 'Invalid subscription type. Must be trial, basic, or premium' };
        }
        if (!subscriptionDurationDays || subscriptionDurationDays < 1) {
          throw { status: 400, message: 'Invalid subscription duration' };
        }
      }

      // ────────────────────── 5. COORDINATES VALIDATION ──────────────────────
      if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
          latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw { status: 400, message: 'Invalid latitude or longitude' };
      }

      // ────────────────────── 6. MOBILE VALIDATION & NORMALIZATION ──────────────────────
      if (!/^\+?[1-9]\d{9,14}$/.test(mobileNo)) {
        throw { status: 400, message: 'Invalid mobile number (e.g., +919876543210)' };
      }
      const normalizedMobileNo = mobileNo.startsWith('+') ? mobileNo : `+91${mobileNo.replace(/^\+/, '')}`;

      // Force channel to 'both'
      const finalPreferredChannel = 'both';

      // ────────────────────── 7. ADDRESS VALIDATION ──────────────────────
      const addrKeys = ['street', 'city', 'state', 'country', 'postalCode'];
      const missingAddr = addrKeys.filter(k => !address?.[k]);
      if (missingAddr.length) {
        throw { status: 400, message: `Address missing: ${missingAddr.join(', ')}` };
      }
      const addressObj = {
        street: address.street.trim(),
        city: address.city.trim(),
        state: address.state.trim(),
        country: address.country.trim(),
        postalCode: address.postalCode.trim()
      };

      // ────────────────────── 8. ACADEMIC YEAR VALIDATION ──────────────────────
        if (!academicYearName || !/^\d{4}-\d{4}$/.test(academicYearName)) {
          throw { status: 400, message: 'Academic year name is required and must be YYYY-YYYY' };
        }

        const [startYearStr, endYearStr] = academicYearName.split('-');
        const startYear = parseInt(startYearStr);
        const endYear = parseInt(endYearStr);

        if (isNaN(startYear) || isNaN(endYear) || endYear !== startYear + 1) {
          throw { status: 400, message: 'Invalid format. Use consecutive years like 2026-2027' };
        }

        // Auto set standard Indian session: April 1 → March 31
        const startDate = new Date(startYear, 3, 1);   // April 1
        const endDate = new Date(endYear, 2, 31);      // March 31

        console.log(`Academic year ${academicYearName} auto dates: ${startDate.toISOString()} → ${endDate.toISOString()}`);

      // ────────────────────── 9. UNIQUE SCHOOL CODE GENERATION ──────────────────────
      let finalCode;
      try {
        const existing = await School.find({}, 'code').session(session);
        const used = existing.map(s => s.code?.toUpperCase()).filter(Boolean);

        const words = schoolName.toUpperCase().split(' ').filter(w => w);
        let base = words.slice(0, 2).map(w => w.substring(0, 3)).join('');
        if (base.length < 3) base = schoolName.toUpperCase().substring(0, 4);
        base = base.substring(0, 4);

        let attempt = 0;
        while (attempt < 50) {
          const suffix = crypto.randomInt(10, 99).toString();
          finalCode = (base + suffix).substring(0, 6).toUpperCase();
          if (!used.includes(finalCode)) break;
          attempt++;
        }
        if (!finalCode) throw new Error('code-gen');
      } catch {
        throw { status: 500, message: 'Failed to generate unique school code' };
      }

      // ────────────────────── 10. DUPLICATE CHECK ──────────────────────
      const [dupUser, dupSchool] = await Promise.all([
        User.findOne({ $or: [{ email }, { username }] }).session(session),
        School.findOne({ name: new RegExp(`^${schoolName}$`, 'i') }).session(session)
      ]);
      if (dupUser) throw { status: 409, message: 'Email or username already exists' };
      if (dupSchool) throw { status: 409, message: 'School name already exists' };

      // ────────────────────── 11. CREATE SCHOOL, ACADEMIC YEAR & ADMIN ──────────────────────
      const newSchool = new School({
        name: schoolName,
        address: addressObj,
        mobileNo: normalizedMobileNo,
        email,
        code: finalCode,
        latitude,
        longitude,
        radius: 100,
        preferredChannel: finalPreferredChannel,
        weeklyHolidayDay: 'Sunday',
        smsPackActive: false,
        status: true,
        fastTrackRegistered: fastTrack,
        registrationType: fastTrack ? 'fast_track' : 'regular',
        assignedBySuperAdmin: req.user.id,
        'communication.smsSenderName': smsSenderName || 'EDGLOBE',
        'communication.emailFrom': emailFrom,
        'communication.emailName': emailName || schoolName,
        'communication.emailPass': emailPass,
        'schoolTiming.openingTime': openingTime || '08:00',
        'schoolTiming.closingTime': closingTime || '14:00',
        'schoolTiming.lunchBreak': lunchBreak || '12:00 - 12:30'
      });

      const newAcademicYear = new AcademicYear({
        schoolId: newSchool._id,
        name: academicYearName,
        startDate,
        endDate,
        isActive: true
      });

      const resetToken = crypto.randomBytes(20).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 3600000);

      const dummyPwd = bcrypt.hashSync(crypto.randomBytes(12).toString('hex'), 10);

      const adminUser = new User({
        name: adminName,
        username,
        email,
        password: dummyPwd,
        role: 'admin',
        schoolId: newSchool._id,
        phoneNumber: normalizedMobileNo,
        whatsappNumber: normalizedMobileNo,
        whatsappOptIn: true,
        resetToken,
        resetTokenExpires,
        status: true,
        isMobileVerified: finalMobileVerified
      });

      newSchool.activeAcademicYear = newAcademicYear._id;
      newSchool.createdBy = adminUser._id;

      await Promise.all([
        newSchool.save({ session }),
        adminUser.save({ session }),
        newAcademicYear.save({ session })
      ]);

      // ────────────────────── 12. SUBSCRIPTION LOGIC (only if superadmin assigns) ──────────────────────
      let subscriptionId = null;
      let subscriptionDetails = null;

      if (assignSubscriptionNow) {
        let planType, priority, smsMonthly, whatsappMonthly;

        if (subscriptionType === 'trial') {
          planType = 'trial';
          priority = 1;
          smsMonthly = subscriptionPlans.trial.smsMonthlyLimit || 1000;
          whatsappMonthly = subscriptionPlans.trial.whatsappMonthlyLimit || 1000;
        } else if (subscriptionType === 'basic') {
          planType = 'both_basic_yearly';
          priority = 2;
          smsMonthly = subscriptionPlans.basic.yearly.smsMonthlyLimit || 10000;
          whatsappMonthly = subscriptionPlans.basic.yearly.whatsappMonthlyLimit || 10000;
        } else if (subscriptionType === 'premium') {
          planType = 'both_premium_yearly';
          priority = 3;
          smsMonthly = subscriptionPlans.premium.yearly.smsMonthlyLimit || 30000;
          whatsappMonthly = subscriptionPlans.premium.yearly.whatsappMonthlyLimit || 30000;
        }

        const expiresAt = new Date(Date.now() + subscriptionDurationDays * 24 * 60 * 60 * 1000);

        const manualSubscription = new Subscription({
          schoolId: newSchool._id,
          planType,
          priority,
          status: 'active',
          startsAt: new Date(),
          expiresAt,
          durationDays: subscriptionDurationDays,
          originalAmount: 0,
          finalAmount: 0,
          messageLimits: {
            smsMonthly,
            whatsappMonthly
          },
          usageStats: {
            smsUsedThisMonth: 0,
            whatsappUsedThisMonth: 0,
            lastResetDate: new Date()
          },
          assignedManually: true,
          assignedBy: req.user.id,
          assignedAt: new Date(),
          assignmentNotes: fastTrack ? 'Fast-track registration' : 'Manual assignment by superadmin'
        });

        await manualSubscription.save({ session });
        subscriptionId = manualSubscription._id;
        subscriptionDetails = manualSubscription;

        // Activate SMS pack on school document
        newSchool.smsPackActive = true;
        newSchool.remainingSms = manualSubscription.messageLimits.smsMonthly;
        newSchool.smsExpiry = manualSubscription.expiresAt;
        newSchool.smsPlan = manualSubscription.planType;
        await newSchool.save({ session });
      }
      // No auto-trial anymore — school can exist without subscription

      // ────────────────────── 13. PENDING SCHOOL UPDATE ──────────────────────
      if (pendingSchoolId) {
        const p = await PendingSchool.findById(pendingSchoolId).session(session);
        if (p) {
          p.status = 'completed';
          await p.save({ session });
        }
      }

      // ────────────────────── 14. SEND PASSWORD RESET EMAIL ──────────────────────
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw { status: 500, message: 'Email credentials missing in environment' };
      }

      const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: { rejectUnauthorized: false }
      });

      const html = `
        <h2>Welcome to EDGlobe Family!</h2>
        <p>Hi <strong>${adminName}</strong>,</p>
        <p>Your school <strong>${schoolName}</strong> (Code: <strong>${finalCode}</strong>) is ready!</p>
        <p><strong>Username:</strong> ${username}</p>
        <p><strong>Academic Year:</strong> ${academicYearName}</p>
        ${subscriptionDetails 
          ? `<p><strong>Initial Subscription:</strong> ${subscriptionDetails.planType} for ${subscriptionDetails.durationDays} days</p>`
          : '<p><strong>Subscription:</strong> Not assigned yet — please upgrade from admin panel</p>'}
        <p>
          <a href="${resetLink}" 
             style="background:#007bff;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
            Set Password Now
          </a>
        </p>
        <p><small>Link expires in 1 hour.</small></p>
        <p>Best regards,<br>EDGlobe Team</p>
      `;

      try {
        await transporter.sendMail({
          from: `"EDGlobe" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: `Welcome to ${schoolName} – Set Your Password`,
          html
        });
        console.log('Password reset email sent successfully');
      } catch (emailErr) {
        console.error('Email failed:', emailErr.message);
        throw { status: 500, message: 'Failed to send email. Check server logs.' };
      }

      // ────────────────────── 15. WHATSAPP / SMS NOTIFICATION ──────────────────────
      let whatsappResult = null;
      try {
        const subMsg = subscriptionDetails
          ? `You have ${subscriptionDetails.durationDays} days of ${subscriptionType} plan`
          : 'No subscription assigned yet – please upgrade from admin panel';

        whatsappResult = await WhatsAppService.sendSchoolOnboarding(
          {
            name: schoolName,
            code: finalCode,
            academicYear: academicYearName,
            subscription: subMsg
          },
          {
            name: adminName,
            username,
            phone: normalizedMobileNo
          }
        );

        if (!whatsappResult?.success) {
          console.warn('WhatsApp failed, falling back to SMS');
          // Optional: add SMS fallback here if needed
        }
      } catch (notificationError) {
        console.error('Notification sending failed:', notificationError);
      }

      // ────────────────────── 16. WELCOME NOTIFICATION IN APP ──────────────────────
      const notif = new Notification({
        schoolId: newSchool._id,
        type: 'welcome',
        title: `Welcome to ${schoolName}!`,
        message: `Your school is ready! Academic Year: ${academicYearName}. ${subscriptionDetails ? `You have ${subscriptionDetails.durationDays} days of ${subscriptionType} plan.` : 'No active subscription yet – please upgrade.'}`,
        recipientId: adminUser._id,
        senderId: req.user.id,
        data: {
          resetLink,
          username,
          schoolName,
          code: finalCode,
          academicYear: academicYearName,
          subscriptionType: subscriptionDetails?.planType,
          subscriptionDuration: subscriptionDetails?.durationDays,
          recipientPhone: normalizedMobileNo
        }
      });
      await notif.save({ session });

      // ────────────────────── 17. AUDIT LOG ──────────────────────
      await new AuditLog({
        userId: req.user.id,
        action: 'create_school',
        details: {
          schoolId: newSchool._id,
          schoolName,
          code: finalCode,
          adminUserId: adminUser._id,
          fastTrack,
          subscriptionAssigned: assignSubscriptionNow,
          subscriptionType: assignSubscriptionNow ? subscriptionType : null,
          subscriptionDuration: assignSubscriptionNow ? subscriptionDurationDays : null,
          academicYear: academicYearName
        }
      }).save({ session });

      // ────────────────────── 18. SUCCESS RESPONSE ──────────────────────
      res.status(201).json({
        message: 'School registered successfully. Password reset link sent to email.',
        data: {
          schoolId: newSchool._id,
          schoolName,
          code: finalCode,
          adminUserId: adminUser._id,
          academicYear: academicYearName,
          subscriptionId,
          subscriptionType: assignSubscriptionNow ? subscriptionType : null,
          subscriptionDuration: assignSubscriptionNow ? subscriptionDurationDays : null,
          fastTrack,
          resetLinkSent: true
        }
      });
    });
  } catch (err) {
    console.error('Registration Error:', err);
    const status = err.status || 500;
    res.status(status).json({
      message: err.message || 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  } finally {
    await session.endSession();
  }
};


const getSchoolById = async (req, res) => {
  try {
    const school = await School.findById(req.params.id)
      .populate('activeAcademicYear', 'name startDate endDate')
      .populate('createdBy', 'name email username');
    if (!school) return res.status(404).json({ message: 'Not found' });
    const { smtpConfig, ...safe } = school.toObject();
    res.json({ message: 'Fetched', data: safe });
  } catch (err) {
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

const getAllSchools = async (req, res) => {
  try {
    const schools = await School.aggregate([
      { $match: { status: true } },
      {
        $lookup: {
          from: 'subscriptions',
          let: { schoolId: '$_id' },
          as: 'allSubscriptions',
          pipeline: [
            { $match: { $expr: { $eq: ['$schoolId', '$$schoolId'] } } },
            { $sort: { priority: -1, expiresAt: -1 } }
          ]
        }
      },
      {
        $addFields: {
          activeSubscription: { $arrayElemAt: ['$allSubscriptions', 0] },
          mainPlan: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$allSubscriptions',
                  as: 'sub',
                  cond: { $eq: ['$$sub.isTemporaryBoost', false] }
                }
              },
              0
            ]
          }
        }
      },
      {
        $addFields: {
          currentPlanType: {
            $cond: {
              if: { $and: [
                { $gt: ['$activeSubscription.expiresAt', new Date()] },
                { $eq: ['$activeSubscription.status', 'active'] }
              ]},
              then: '$activeSubscription.planType',
              else: { $ifNull: ['$mainPlan.planType', 'none'] }
            }
          },
          currentPlanName: {
            $switch: {
              branches: [
                { case: { $eq: ['$currentPlanType', 'both_premium_monthly'] }, then: 'Premium Monthly' },
                { case: { $eq: ['$currentPlanType', 'both_premium_yearly'] }, then: 'Premium Yearly' },
                { case: { $eq: ['$currentPlanType', 'both_basic_yearly'] }, then: 'Basic Yearly (Both)' },
                { case: { $eq: ['$currentPlanType', 'sms_basic_yearly'] }, then: 'Basic Yearly (SMS)' },
                { case: { $eq: ['$currentPlanType', 'whatsapp_basic_yearly'] }, then: 'Basic Yearly (WhatsApp)' },
                { case: { $eq: ['$currentPlanType', 'trial'] }, then: 'Trial' },
              ],
              default: 'No Plan'
            }
          },
          planStatus: {
            $cond: {
              if: { $and: [
                { $ne: ['$activeSubscription', null] },
                { $gt: ['$activeSubscription.expiresAt', new Date()] }
              ]},
              then: 'Active',
              else: 'Expired'
            }
          },
          isBoostActive: {
            $and: [
              { $eq: ['$activeSubscription.isTemporaryBoost', true] },
              { $gt: ['$activeSubscription.expiresAt', new Date()] }
            ]
          }
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          currentPlanName: 1,
          currentPlanType: 1,
          planStatus: 1,
          'activeSubscription.expiresAt': 1,
          isBoostActive: 1,
          createdAt: 1
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    res.json({ message: 'Listed', data: schools });
  } catch (err) {
    console.error('Superadmin getAllSchools error:', err);
    res.status(500).json({ message: 'Error', error: err.message });
  }
};

module.exports = { registerSchool, getSchoolById, getAllSchools };