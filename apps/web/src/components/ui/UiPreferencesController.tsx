"use client";

import { useEffect } from "react";
import { applyUiPreferences, loadUiPreferences } from "../../lib/uiPreferences";

export function UiPreferencesController() {
  useEffect(() => {
    applyUiPreferences(loadUiPreferences());
  }, []);

  return null;
}

