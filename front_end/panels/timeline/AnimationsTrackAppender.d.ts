import * as Trace from '../../models/trace/trace.js';
import { type CompatibilityTracksAppender, type TrackAppender, type TrackAppenderName } from './CompatibilityTracksAppender.js';
export declare class AnimationsTrackAppender implements TrackAppender {
    #private;
    readonly appenderName: TrackAppenderName;
    constructor(compatibilityBuilder: CompatibilityTracksAppender, parsedTrace: Trace.TraceModel.ParsedTrace);
    appendTrackAtLevel(trackStartLevel: number, expanded?: boolean | undefined): number;
    colorForEvent(): string;
}
