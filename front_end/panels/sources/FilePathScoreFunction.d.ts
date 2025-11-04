export declare class FilePathScoreFunction {
    private query;
    private readonly queryUpperCase;
    private score;
    private sequence;
    private dataUpperCase;
    private fileNameIndex;
    constructor(query: string);
    /**
     * Calculates the score of a given data string against the query string.
     *
     * The score is calculated by comparing the characters of the query string to
     * the characters of the data string. Characters that match are given a score
     * of 10, while characters that don't match are given a score of 0. The score
     * of a match is also influenced by the context of the match. For example,
     * matching the beginning of the file name is worth more than matching a
     * character in the middle of the file name.
     *
     * The score of a match is also influenced by the number of consecutive
     * matches. The more consecutive matches there are, the higher the score.
     *
     * @param data The data string to score.
     * @param matchIndexes An optional array to store the indexes of matching
     * characters. If provided, it will be filled with the indexes of the matching
     * characters in the data string.
     * @returns The score of the data string.
     */
    calculateScore(data: string, matchIndexes: number[] | null): number;
    private testWordStart;
    private restoreMatchIndexes;
    private singleCharScore;
    private sequenceCharScore;
    private match;
}
