package ca.bazlur.contention;

import java.util.ArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class ContentionNarrow {

    private int seats = 40;

    void main() {
        long start = System.nanoTime();
        var results = new ArrayList<Future<Boolean>>();
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int customer = 0; customer < 50; customer++) {
                results.add(executor.submit(this::reserve));
            }
        }
        long confirmed = results.stream().filter(Future::resultNow).count();
        long millis = (System.nanoTime() - start) / 1_000_000;
        IO.println("confirmed %d, turned away %d, %,d ms"
                .formatted(confirmed, results.size() - confirmed, millis));
    }

    private boolean reserve() throws InterruptedException {
        synchronized (this) {
            if (seats == 0) {
                return false;
            }
            seats--;
        }
        try {
            chargeCard();
        } catch (Exception e) {
            synchronized (this) {
                seats++;
            }
            throw e;
        }
        return true;
    }

    private void chargeCard() throws InterruptedException {
        Thread.sleep(80);
    }
}
