import {
    trigger,
    transition,
    style,
    query,
    animate,
    stagger,
    group,
    animateChild,
} from '@angular/animations';

export const fadeSlideAnimation = trigger('routeAnimations', [
    transition('* <=> *', [
        style({ position: 'relative' }),
        query(':enter, :leave', [
            style({
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                opacity: 0,
            }),
        ], { optional: true }),
        query(':enter', [
            style({ transform: 'translateY(10px)', opacity: 0 }),
        ], { optional: true }),
        group([
            query(':leave', [
                animate('300ms ease-out', style({ transform: 'translateY(-10px)', opacity: 0 })),
            ], { optional: true }),
            query(':enter', [
                animate('400ms 100ms ease-out', style({ transform: 'translateY(0)', opacity: 1 })),
            ], { optional: true }),
        ]),
    ]),
]);

export const listAnimation = trigger('listAnimation', [
    transition('* <=> *', [
        query(':enter', [
            style({ opacity: 0, transform: 'translateY(20px)' }),
            stagger('50ms', [
                animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
            ]),
        ], { optional: true }),
    ]),
]);

export const modalAnimation = trigger('modalAnimation', [
    transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1) translateY(0)' })),
    ]),
    transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' })),
    ]),
]);

export const fadeIn = trigger('fadeIn', [
    transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 })),
    ]),
]);
