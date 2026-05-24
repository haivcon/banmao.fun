"use client";
import { useEffect } from "react";

export default function ScrollEnabler() {
    useEffect(() => {
        // Force enable scroll - override landing.css
        document.documentElement.style.setProperty('overflow', 'auto', 'important');
        document.documentElement.style.setProperty('overflow-x', 'hidden', 'important');
        document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
        document.documentElement.style.setProperty('position', 'relative', 'important');
        document.documentElement.style.setProperty('height', 'auto', 'important');
        
        document.body.style.setProperty('overflow', 'auto', 'important');
        document.body.style.setProperty('overflow-x', 'hidden', 'important');
        document.body.style.setProperty('overflow-y', 'auto', 'important');
        document.body.style.setProperty('position', 'relative', 'important');
        document.body.style.setProperty('height', 'auto', 'important');
        
        // Add a class to body to scope scrollbar styles
        document.body.classList.add('worldcup-theme-scroll');
        
        return () => {
            document.documentElement.style.overflow = '';
            document.documentElement.style.overflowX = '';
            document.documentElement.style.overflowY = '';
            document.documentElement.style.position = '';
            document.documentElement.style.height = '';
            document.body.style.overflow = '';
            document.body.style.overflowX = '';
            document.body.style.overflowY = '';
            document.body.style.position = '';
            document.body.style.height = '';
            document.body.classList.remove('worldcup-theme-scroll');
        };
    }, []);
    return null;
}
