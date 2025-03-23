import { Request, Response, NextFunction } from 'express';

export function authenticate(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization?.split(' ')[1];
    const originalToken = process.env.TOKEN;
    // if (token !== originalToken) {
    //     return res.status(401).send('Access Denied');
    // }
    next();
};
