$(document).ready(function () {
// -------------------------------------------------
// --------   AOS SCROLL TRANSITION INIT  ----------
// -------------------------------------------------
    AOS.init();

// -------------------------------------------------
// -------------   TOPBAR SCROLL  ------------------
// -------------------------------------------------
    $(window).scroll(function () {
        if ($(window).scrollTop() > (50)) {
            $('.navbar').addClass('on-scroll');
        } else {
            $('.navbar').removeClass('on-scroll');
        }
    });

// -------------------------------------------------
// -------------   TOPBAR MENU SCROLL  -------------
// -------------------------------------------------
    $(document).on('click', '.navbar-nav .nav-link[href^="#"]', function (event) {
        event.preventDefault();
        $('.navbar-nav').removeClass('show');
        $('body').removeClass('overflow-hidden');
        $('#burger-menu').removeClass('show');
        $('html, body').animate({
            scrollTop: $($.attr(this, 'href')).offset().top
        }, 700);
    });

// -------------------------------------------------
// -------------   TOGGLE MOBILE MENU  -------------
// -------------------------------------------------
    $('#burger-menu').on('click', function () {
        $(this).toggleClass('show');
        $('.navbar-nav').toggleClass('show');
        $('body').toggleClass('overflow-hidden');
    });

// -------------------------------------------------
// -------------   SERVICE SWIPER  -----------------
// -------------------------------------------------
    const service_swiper = new Swiper('#service-swiper', {
        slidesPerView: 2,
        spaceBetween: 10,
        navigation: {
            nextEl: '.services-button-next',
            prevEl: '.services-button-prev',
        },
        breakpoints: {
            576: {
                slidesPerView: 3,
                spaceBetween: 10,
            },
            768: {
                slidesPerView: 4,
                spaceBetween: 10,
            },
            1024: {
                slidesPerView: 6,
                spaceBetween: 15,
            },
        },
    });

// -------------------------------------------------
// -------------   BRAND SWIPER  -------------------
// -------------------------------------------------
    const brand_swiper = new Swiper('#brand-swiper', {
        slidesPerView: 2,
        spaceBetween: 10,
        navigation: {
            nextEl: '.brand-button-next',
            prevEl: '.brand-button-prev',
        },
        breakpoints: {
            576: {
                slidesPerView: 3,
                spaceBetween: 10,
            },
            768: {
                slidesPerView: 4,
                spaceBetween: 10,
            },
            1024: {
                slidesPerView: 6,
                spaceBetween: 15,
            },
        },
    });

// -------------------------------------------------
// -------------   FEEDBACK SWIPER  ----------------
// -------------------------------------------------
    const feedback_swiper = new Swiper('#feedback-swiper', {
        slidesPerView: 1,
        spaceBetween: 0,
        navigation: {
            nextEl: '.feedback-button-next',
            prevEl: '.feedback-button-prev',
        },
        breakpoints: {
            1024: {
                slidesPerView: 2,
                spaceBetween: 15,
            },
        },
    });
});