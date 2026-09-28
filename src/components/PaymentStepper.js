import React from 'react';
import './PaymentStepper.css';

const PaymentStepper = ({ steps }) => {
  return (
    <div className="stepper-box">
      {steps.map((step, index) => (
        <div
          key={index}
          className={`stepper-step ${step.status === 'completed' ? 'stepper-completed' : step.status === 'active' ? 'stepper-active' : 'stepper-pending'}`}
        >
          <div className="stepper-circle">
            {step.status === 'completed' ? (
              <svg viewBox="0 0 16 16" className="bi bi-check-lg" fill="currentColor" height="16" width="16" xmlns="http://www.w3.org/2000/svg">
                <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z" />
              </svg>
            ) : (
              index + 1
            )}
          </div>
          <div className="stepper-line" />
          <div className="stepper-content">
            <div className="stepper-title">{step.title}</div>
            <div className="stepper-status">{step.label}</div>
            {step.time && <div className="stepper-time">{step.time}</div>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PaymentStepper;
