import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles 
} from 'lucide-react';
import { useWalkthrough, WALKTHROUGH_STEPS } from './WalkthroughContext';

export const WalkthroughOverlay: React.FC = () => {
  const {
    isActive,
    currentStepIndex,
    currentStep,
    nextStep,
    prevStep,
    skipWalkthrough,
    finishWalkthrough
  } = useWalkthrough();

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: string }>({
    top: 100,
    left: 100,
    placement: 'bottom'
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!isActive || !currentStep) return;

    let targetEl = document.querySelector(currentStep.targetSelector) as HTMLElement | null;

    if (!targetEl) {
      if (currentStep.targetSelector.includes('inspector')) {
        targetEl = document.querySelector('.object-inspector-panel') as HTMLElement | null;
      }
    }

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      setTargetRect(rect);

      if (rect.top < 70 || rect.bottom > window.innerHeight - 70) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      const margin = 14;
      const tooltipW = Math.min(360, window.innerWidth - 32);
      const tooltipH = 220;

      let top = rect.bottom + margin;
      let left = rect.left + rect.width / 2 - tooltipW / 2;
      let placement = 'bottom';

      if (currentStep.preferredPlacement === 'top' || (top + tooltipH > window.innerHeight && rect.top - tooltipH - margin > 60)) {
        top = rect.top - tooltipH - margin;
        placement = 'top';
      } else if (currentStep.preferredPlacement === 'left' && rect.left > tooltipW + margin + 20) {
        top = Math.max(70, rect.top + rect.height / 2 - tooltipH / 2);
        left = rect.left - tooltipW - margin;
        placement = 'left';
      } else if (currentStep.preferredPlacement === 'right' && rect.right + tooltipW + margin < window.innerWidth) {
        top = Math.max(70, rect.top + rect.height / 2 - tooltipH / 2);
        left = rect.right + margin;
        placement = 'right';
      }

      const bottomNavOffset = window.innerWidth <= 860 ? 86 : 20;
      left = Math.max(16, Math.min(window.innerWidth - tooltipW - 16, left));
      top = Math.max(70, Math.min(window.innerHeight - tooltipH - bottomNavOffset, top));

      setTooltipPos({ top, left, placement });
    } else {
      setTargetRect(null);
      const bottomNavOffset = window.innerWidth <= 860 ? 40 : 0;
      setTooltipPos({
        top: Math.max(70, (window.innerHeight - bottomNavOffset) / 2 - 110),
        left: Math.max(16, window.innerWidth / 2 - 180),
        placement: 'center'
      });
    }
  }, [isActive, currentStep]);

  useEffect(() => {
    updatePosition();
    const handleResize = () => updatePosition();
    const handleScroll = () => updatePosition();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    const interval = setInterval(updatePosition, 300);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      clearInterval(interval);
    };
  }, [updatePosition]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        skipWalkthrough();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, skipWalkthrough, nextStep, prevStep]);

  if (!isActive || !currentStep) return null;

  const stepFormatted = String(currentStep.stepNumber).padStart(2, '0');
  const totalFormatted = String(currentStep.totalSteps).padStart(2, '0');
  const isFinalStep = currentStep.stepNumber === currentStep.totalSteps;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      <div 
        onClick={skipWalkthrough}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 14, 0.55)',
          pointerEvents: 'auto',
          transition: 'all 0.3s ease'
        }} 
      />

      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: 'var(--radius-sm)',
            border: '2px solid var(--accent-cyan)',
            boxShadow: '0 0 24px rgba(56, 189, 248, 0.45), inset 0 0 12px rgba(56, 189, 248, 0.15)',
            pointerEvents: 'none',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            animation: 'walkthroughPulse 2s infinite ease-in-out'
          }}
        />
      )}

      <div
        ref={tooltipRef}
        className="glass-panel tech-corner"
        style={{
          position: 'fixed',
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: '360px',
          maxWidth: 'calc(100vw - 32px)',
          background: 'rgba(7, 17, 31, 0.96)',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.8), 0 0 25px rgba(56, 189, 248, 0.2)',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          pointerEvents: 'auto',
          transition: 'top 0.25s ease, left 0.25s ease',
          animation: 'walkthroughTooltipPop 0.25s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--accent-cyan)',
              background: 'rgba(56, 189, 248, 0.12)',
              padding: '2px 6px',
              borderRadius: '3px',
              border: '1px solid rgba(56, 189, 248, 0.25)'
            }}>
              {stepFormatted} / {totalFormatted}
            </span>
            {currentStep.subtitle && (
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {currentStep.subtitle}
              </span>
            )}
          </div>

          <button
            onClick={skipWalkthrough}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              minWidth: '36px',
              minHeight: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation'
            }}
            title="Close Tour (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', margin: '0 0 4px' }}>
            {currentStep.title}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
            {currentStep.description}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', margin: '2px 0' }}>
          {WALKTHROUGH_STEPS.map((step, idx) => (
            <div
              key={step.id}
              style={{
                width: idx === currentStepIndex ? '16px' : '6px',
                height: '4px',
                borderRadius: '2px',
                background: idx === currentStepIndex 
                  ? 'var(--accent-cyan)' 
                  : idx < currentStepIndex 
                  ? 'rgba(56, 189, 248, 0.4)' 
                  : 'rgba(255, 255, 255, 0.1)',
                transition: 'all 0.2s ease'
              }}
            />
          ))}
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '8px',
          borderTop: '1px solid var(--border-hairline)',
          gap: '8px'
        }}>
          <button
            onClick={skipWalkthrough}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '11px',
              cursor: 'pointer',
              padding: '6px 8px',
              minHeight: '36px',
              touchAction: 'manipulation'
            }}
          >
            Skip
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className="btn btn-secondary"
              style={{
                fontSize: '11px',
                padding: '6px 12px',
                minHeight: '36px',
                touchAction: 'manipulation',
                opacity: currentStepIndex === 0 ? 0.35 : 1,
                cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={13} />
              <span>Back</span>
            </button>

            {isFinalStep ? (
              <button
                onClick={() => finishWalkthrough(true)}
                className="btn btn-primary"
                style={{
                  fontSize: '11px',
                  padding: '6px 14px',
                  minHeight: '36px',
                  touchAction: 'manipulation',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 0 12px rgba(56, 189, 248, 0.35)'
                }}
              >
                <span>{currentStep.actionLabel || 'Enter Explore the Space'}</span>
                <Sparkles size={13} />
              </button>
            ) : (
              <button
                onClick={nextStep}
                className="btn btn-primary"
                style={{
                  fontSize: '11px',
                  padding: '6px 14px',
                  minHeight: '36px',
                  touchAction: 'manipulation',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span>{currentStep.actionLabel || 'Next'}</span>
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes walkthroughPulse {
          0%, 100% {
            box-shadow: 0 0 20px rgba(56, 189, 248, 0.45), inset 0 0 10px rgba(56, 189, 248, 0.15);
          }
          50% {
            box-shadow: 0 0 32px rgba(56, 189, 248, 0.7), inset 0 0 16px rgba(56, 189, 248, 0.25);
          }
        }
        @keyframes walkthroughTooltipPop {
          from { opacity: 0; transform: scale(0.96) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes walkthroughFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
